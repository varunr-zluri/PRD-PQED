const { WebClient } = require('@slack/web-api');
const config = require('../config/env');

// Initialize Slack client
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Channel for notifications
const APPROVAL_CHANNEL = process.env.SLACK_CHANNEL_ID;

// Dashboard URLs
const APPROVAL_DASHBOARD_URL = `${config.frontendUrl}/approvals`;
const MY_SUBMISSIONS_URL = `${config.frontendUrl}/history`;

/**
 * Look up Slack user by email and return their user ID
 * Requires 'users:read.email' scope
 */
const getUserByEmail = async (email) => {
    if (!email) return null;
    try {
        console.log(`[Slack] Looking up user by email: ${email}`);
        const result = await slack.users.lookupByEmail({ email });
        console.log(`[Slack] Found user: ${result.user?.id} (${result.user?.name})`);
        return result.user?.id || null;
    } catch (error) {
        console.error(`[Slack] Could not find user by email ${email}:`, error.message);
        return null;
    }
};

/**
 * Send a direct message to a user by their Slack ID
 */
const sendDM = async (userId, text, blocks = null) => {
    if (!userId) return false;
    try {
        const options = { channel: userId, text };
        if (blocks) options.blocks = blocks;
        await slack.chat.postMessage(options);
        console.log(`[Slack] Sent DM to user ${userId}`);
        return true;
    } catch (error) {
        console.error(`[Slack] Failed to send DM to ${userId}:`, error.message);
        return false;
    }
};

/**
 * Truncate query preview to a reasonable length
 */
const getQueryPreview = (request) => {
    if (request.submission_type === 'SCRIPT') {
        return '[Script Upload]';
    }
    const content = request.query_content || '';
    return content.length > 100 ? content.substring(0, 100) + '...' : content;
};

/**
 * SUBMISSION: Channel message + DM to manager
 */
const notifyNewSubmission = async (request, requester, managerEmail) => {
    const queryPreview = getQueryPreview(request);
    const commentText = request.comments ? `*Comment:* ${request.comments}\n` : '';

    const messageText = `:database: *New Query Request*
*ID:* #${request.id}
*Requester:* ${requester.email}
*Database:* ${request.instance_name} (${request.db_type})
*POD:* ${request.pod_name}
${commentText}*Query Preview:* \`${queryPreview}\``;

    // Channel notification
    if (APPROVAL_CHANNEL) {
        try {
            await slack.chat.postMessage({
                channel: APPROVAL_CHANNEL,
                text: `:database: New Query Request #${request.id}`,
                blocks: [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: messageText
                    }
                }]
            });
            console.log(`[Slack] Sent channel notification for new request #${request.id}`);
        } catch (error) {
            console.error('[Slack] Failed to send channel notification:', error.message);
        }
    }

    // DM to manager (POD manager)
    if (managerEmail) {
        const managerId = await getUserByEmail(managerEmail);
        if (managerId) {
            await sendDM(managerId, `New Query Request #${request.id} to Review`, [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: messageText
                    }
                },
                {
                    type: 'actions',
                    elements: [{
                        type: 'button',
                        text: { type: 'plain_text', text: '📋 Open Approval Dashboard', emoji: true },
                        url: APPROVAL_DASHBOARD_URL,
                        style: 'primary'
                    }]
                }
            ]);
        }
    }
};

/**
 * APPROVAL: Channel status + DM result to both manager and user
 */
const notifyApprovalResult = async (request, approver, executionResult, requesterEmail) => {
    const isSuccess = executionResult.success;
    const emoji = isSuccess ? ':white_check_mark:' : ':x:';
    const status = isSuccess ? 'Query Executed Successfully' : 'Query Execution Failed';

    // Format result preview
    let resultPreview = '';
    if (isSuccess) {
        const result = executionResult.result;
        if (typeof result === 'object') {
            // Prefer total_rows (actual count) over array.length (potentially truncated)
            if (result?.total_rows !== undefined && result?.total_rows !== null) {
                resultPreview = `${result.total_rows} rows returned`;
            } else if (Array.isArray(result?.rows)) {
                resultPreview = `${result.rows.length} rows returned`;
            } else if (Array.isArray(result)) {
                resultPreview = `${result.length} rows returned`;
            } else if (result?.output) {
                // Script output
                resultPreview = String(result.output).substring(0, 100);
            } else {
                resultPreview = JSON.stringify(result).substring(0, 100);
            }
        } else {
            resultPreview = String(result).substring(0, 100);
        }
    } else {
        resultPreview = executionResult.error || 'Unknown error';
    }

    const channelMessage = `${emoji} *${status}*
*ID:* #${request.id}
*Approved by:* ${approver.email}
*Result:* ${resultPreview}`;

    // Channel: Status only
    if (APPROVAL_CHANNEL) {
        try {
            await slack.chat.postMessage({
                channel: APPROVAL_CHANNEL,
                text: `${emoji} ${status} - Request #${request.id}`,
                blocks: [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: channelMessage
                    }
                }]
            });
        } catch (error) {
            console.error('[Slack] Failed to send channel notification:', error.message);
        }
    }

    const resultSection = {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: channelMessage
        }
    };

    // DM to requester (with My Submissions link)
    if (requesterEmail) {
        const requesterId = await getUserByEmail(requesterEmail);
        if (requesterId) {
            await sendDM(requesterId, `${emoji} Your Query ${isSuccess ? 'Executed' : 'Failed'} - #${request.id}`, [
                resultSection,
                {
                    type: 'actions',
                    elements: [{
                        type: 'button',
                        text: { type: 'plain_text', text: '📋 View Details', emoji: true },
                        url: MY_SUBMISSIONS_URL
                    }]
                }
            ]);
        }
    }

    // DM to approver (manager) with Approval Dashboard link
    if (approver.email) {
        const approverId = await getUserByEmail(approver.email);
        if (approverId) {
            await sendDM(approverId, `${emoji} Query ${isSuccess ? 'Executed' : 'Failed'} - #${request.id}`, [
                resultSection,
                {
                    type: 'actions',
                    elements: [{
                        type: 'button',
                        text: { type: 'plain_text', text: '📋 View Details', emoji: true },
                        url: APPROVAL_DASHBOARD_URL
                    }]
                }
            ]);
        }
    }
};

/**
 * REJECTION: DM to user only
 */
const notifyRejection = async (request, approver, requesterEmail, reason) => {
    if (!requesterEmail) return;

    const queryPreview = getQueryPreview(request);

    const messageText = `:x: *Query Request Rejected*
*ID:* #${request.id}
*Rejected by:* ${approver.email}
*Reason:* ${reason || 'No reason provided'}
*Original Query:* \`${queryPreview}\``;

    const requesterId = await getUserByEmail(requesterEmail);
    if (requesterId) {
        await sendDM(requesterId, `Your Query Request #${request.id} was Rejected`, [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: messageText
                }
            },
            {
                type: 'actions',
                elements: [{
                    type: 'button',
                    text: { type: 'plain_text', text: '📋 View My Submissions', emoji: true },
                    url: MY_SUBMISSIONS_URL
                }]
            }
        ]);
        console.log(`[Slack] Sent rejection DM to ${requesterEmail}`);
    }
};

module.exports = {
    notifyNewSubmission,
    notifyApprovalResult,
    notifyRejection,
    getUserByEmail,
    sendDM
};
