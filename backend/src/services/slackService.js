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
 * SUBMISSION: Channel message + DM to manager
 */
const notifyNewSubmission = async (request, requester, managerEmail) => {
    // Channel notification
    if (APPROVAL_CHANNEL) {
        try {
            await slack.chat.postMessage({
                channel: APPROVAL_CHANNEL,
                text: `:database: New Query Request`,
                blocks: [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `:database: *New Query Request*\n*Requester:* ${requester.name}\n*Database:* ${request.instance_name} (${request.db_type})\n*POD:* ${request.pod_name}\n*Type:* ${request.submission_type}`
                    }
                }]
            });
            console.log(`[Slack] Sent channel notification for new request`);
        } catch (error) {
            console.error('[Slack] Failed to send channel notification:', error.message);
        }
    }

    // DM to manager (POD manager)
    if (managerEmail) {
        const managerId = await getUserByEmail(managerEmail);
        if (managerId) {
            const queryPreview = request.submission_type === 'SCRIPT'
                ? '[Script Upload]'
                : (request.query_content?.substring(0, 200) || 'N/A');

            await sendDM(managerId, 'New Query Request to Review', [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `:bell: *New Query Request for Review*\n*Requester:* ${requester.name} (${requester.email})\n*Database:* ${request.instance_name} (${request.db_type})\n*POD:* ${request.pod_name}\n*Query:*\n\`\`\`${queryPreview}\`\`\``
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
    const status = isSuccess ? 'Executed Successfully' : 'Execution Failed';

    // Channel: Status only (no result preview)
    if (APPROVAL_CHANNEL) {
        try {
            await slack.chat.postMessage({
                channel: APPROVAL_CHANNEL,
                text: `${emoji} Query ${status}`,
                blocks: [{
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `${emoji} *Query ${status}*\n*Database:* ${request.instance_name}\n*Approved by:* ${approver.name}`
                    }
                }]
            });
        } catch (error) {
            console.error('[Slack] Failed to send channel notification:', error.message);
        }
    }

    // Result preview for DMs
    const resultPreview = isSuccess
        ? JSON.stringify(executionResult.result).substring(0, 500)
        : executionResult.error;

    const dmBlocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `${emoji} *Query ${status}*\n*Database:* ${request.instance_name} (${request.db_type})\n\n*Result:*\n\`\`\`${resultPreview}${resultPreview.length >= 500 ? '...' : ''}\`\`\``
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
    ];

    // DM to requester
    if (requesterEmail) {
        const requesterId = await getUserByEmail(requesterEmail);
        if (requesterId) {
            await sendDM(requesterId, `${emoji} Your Query ${status}`, dmBlocks);
        }
    }

    // DM to approver (manager)
    if (approver.email) {
        const approverId = await getUserByEmail(approver.email);
        if (approverId) {
            await sendDM(approverId, `${emoji} Query ${status}`, dmBlocks);
        }
    }
};

/**
 * REJECTION: DM to user only
 */
const notifyRejection = async (request, approver, requesterEmail, reason) => {
    if (!requesterEmail) return;

    const requesterId = await getUserByEmail(requesterEmail);
    if (requesterId) {
        await sendDM(requesterId, 'Your Query Request was Rejected', [
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `:no_entry: *Your Query Request was Rejected*\n*Database:* ${request.instance_name} (${request.db_type})\n*Rejected by:* ${approver.name}\n*Reason:* ${reason || 'No reason provided'}`
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
