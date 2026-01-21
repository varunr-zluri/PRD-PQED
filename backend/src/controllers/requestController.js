const { QueryRequest, User, QueryExecution } = require('../entities');
const { getEM } = require('../config/database');
const executionService = require('../services/executionService');
const slackService = require('../services/slackService');
const { validateQuery } = require('../services/validateQuery');
const { detectDestructiveOperations } = require('../services/destructiveDetector');


const submitRequest = async (req, res) => {
    try {
        const { db_type, instance_name, database_name, submission_type, query_content, comments, pod_name } = req.body;
        const em = getEM();

        const requestData = {
            requester: req.user,
            requester_name: req.user.name, // Denormalized for search
            db_type,
            instance_name,
            database_name,
            submission_type,
            comments,
            pod_name,
            status: 'PENDING'
        };

        if (submission_type === 'QUERY') {
            // Validate query syntax before submission
            const validation = validateQuery(query_content, db_type);
            if (!validation.valid) {
                return res.status(400).json({ error: validation.error });
            }
            requestData.query_content = query_content;
        } else if (submission_type === 'SCRIPT') {
            if (req.file) {
                requestData.script_path = req.file.path;
            } else if (req.body.cloned_script_path) {
                requestData.script_path = req.body.cloned_script_path;
            } else {
                return res.status(400).json({ error: 'Script file is required for SCRIPT submission' });
            }
        }

        const request = em.create(QueryRequest, requestData);
        await em.persistAndFlush(request);

        // Find manager for the POD to send DM
        const manager = await em.findOne(User, { role: 'MANAGER', pod_name });
        const managerEmail = manager?.email || null;

        // Send Slack notification for new submission (channel + manager DM)
        slackService.notifyNewSubmission(request, req.user, managerEmail).catch(err =>
            console.error('[Slack] Notification failed:', err.message)
        );

        res.status(201).json(request.toJSON());
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

const buildWhereClause = (query) => {
    const { status, pod_name, start_date, end_date, search, db_type, submission_type, database_name, requester_id, approver_id } = query;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (pod_name) whereClause.pod_name = pod_name;
    if (db_type) whereClause.db_type = db_type;
    if (submission_type) whereClause.submission_type = submission_type;
    if (database_name) whereClause.database_name = database_name;
    if (requester_id) whereClause.requester = requester_id;
    if (approver_id) whereClause.approver = approver_id;

    if (start_date && end_date) {
        // Set end_date to end of day (23:59:59.999) to include all records from that day
        const endOfDay = new Date(end_date);
        endOfDay.setHours(23, 59, 59, 999);

        whereClause.created_at = {
            $gte: new Date(start_date),
            $lte: endOfDay
        };
    }

    // Case-insensitive search across visible fields (denormalized - no JOINs needed)
    if (search) {
        whereClause.$or = [
            { query_content: { $ilike: `%${search}%` } },
            { requester_name: { $ilike: `%${search}%` } },
            { instance_name: { $ilike: `%${search}%` } },
            { database_name: { $ilike: `%${search}%` } },
            { comments: { $ilike: `%${search}%` } }
        ];
    }

    return whereClause;
};

const getRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = buildWhereClause(req.query);
        const em = getEM();

        if (req.user.role === 'MANAGER' && req.user.pod_name) {
            whereClause.pod_name = req.user.pod_name;
        }

        const [rows, count] = await em.findAndCount(QueryRequest, whereClause, {
            populate: ['requester', 'approver'],
            orderBy: { created_at: 'DESC' },
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const requests = rows.map(r => r.toJSON());
        res.json({ requests, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMySubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;
        const whereClause = buildWhereClause(req.query);
        whereClause.requester = req.user.id;
        const em = getEM();

        const [rows, count] = await em.findAndCount(QueryRequest, whereClause, {
            orderBy: { created_at: 'DESC' },
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        const requests = rows.map(r => r.toJSON());

        res.json({ requests, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const RETENTION_DAYS = 30;

const getExpiryDate = (createdAt) => {
    const expiry = new Date(createdAt);
    expiry.setDate(expiry.getDate() + RETENTION_DAYS);
    return expiry;
};

const getRequestById = async (req, res) => {
    try {
        const em = getEM();
        const includeExecution = req.query.include === 'execution';
        const request = await em.findOne(QueryRequest, { id: parseInt(req.params.id) }, {
            populate: ['requester', 'approver', 'executions']
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Build result object using toJSON and add script content if applicable
        const buildResult = (r) => {
            const result = r.toJSON();
            // Include script filename for SCRIPT type submissions
            if (r.submission_type === 'SCRIPT' && r.script_path) {
                // script_path is now a Cloudinary URL
                result.script_filename = 'script.js'; // Default or extract from URL if needed
                // We no longer embed script_content as it is a remote file
            }

            // Detect destructive operations for PENDING requests (to warn managers)
            if (r.status === 'PENDING') {
                const contentToCheck = r.query_content || ''; // For scripts, we'd need to fetch content
                const detection = detectDestructiveOperations(contentToCheck, r.db_type, r.submission_type);
                result.is_destructive = detection.isDestructive;
                result.destructive_warnings = detection.warnings;
            }

            // Include executions if populated
            if (r.executions && r.executions.isInitialized()) {
                result.executions = r.executions.getItems().map(e => {
                    const execData = {
                        id: e.id,
                        status: e.status,
                        result_data: e.result_data,
                        error_message: e.error_message,
                        script_logs: e.script_logs,
                        executed_at: e.executed_at,
                        is_truncated: e.is_truncated,
                        total_rows: e.total_rows
                    };

                    // Add CSV availability info when include=execution
                    if (includeExecution && e.is_truncated) {
                        const expiresAt = getExpiryDate(e.created_at);
                        let csvAvailable = false;
                        let csvExpired = false;

                        if (e.result_file_path) {
                            if (new Date() > expiresAt) {
                                csvExpired = true;
                            } else {
                                // Cloud file - available until expired
                                csvAvailable = true;
                            }
                        }

                        execData.csv_available = csvAvailable;
                        execData.csv_expired = csvExpired;
                        execData.expires_at = expiresAt;
                    }

                    return execData;
                });
            }
            return result;
        };

        // Access control based on role
        if (req.user.role === 'ADMIN') {
            return res.json(buildResult(request));
        }

        if (req.user.role === 'MANAGER') {
            if (request.pod_name !== req.user.pod_name) {
                return res.status(403).json({ error: 'Access denied. Request belongs to a different POD.' });
            }
            return res.json(buildResult(request));
        }

        // DEVELOPER can only see their own requests
        const requesterId = request.requester?.id || request.requester;
        if (requesterId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied. You can only view your own requests.' });
        }

        res.json(buildResult(request));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRequest = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const em = getEM();
        // Populate requester to get email for Slack DM
        const request = await em.findOne(QueryRequest, { id: parseInt(req.params.id) }, {
            populate: ['requester']
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (req.user.role === 'MANAGER' && req.user.pod_name !== request.pod_name) {
            return res.status(403).json({ error: 'You can only update requests for your POD' });
        }

        if (status === 'APPROVED') {
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'Request is already approved' });
            }

            request.status = 'APPROVED';
            request.approver = req.user;
            request.approved_at = new Date();
            await em.flush();

            const executionResult = await executionService.executeRequest(request);
            let executionStatus = executionResult.success ? 'SUCCESS' : 'FAILURE';
            request.status = executionResult.success ? 'EXECUTED' : 'FAILED';

            // Extract truncation metadata from result
            const resultData = executionResult.success ? executionResult.result : null;

            // Combine stdout and stderr for script_logs
            const scriptLogs = resultData?.logs?.length || resultData?.errors?.length
                ? JSON.stringify({
                    stdout: resultData.logs || [],
                    stderr: resultData.errors || []
                })
                : null;

            const execution = em.create(QueryExecution, {
                request: request,
                status: executionStatus,
                result_data: resultData ? JSON.stringify(resultData.rows || resultData.output) : null,
                error_message: executionResult.success ? null : executionResult.error,
                script_logs: scriptLogs,
                executed_at: new Date(),
                // Truncation metadata
                is_truncated: resultData?.is_truncated || false,
                total_rows: resultData?.total_rows || null,
                result_file_path: resultData?.result_file_path || null
            });

            await em.persistAndFlush(execution);

            // Send Slack notification for approval result (channel + DM to requester)
            const requesterEmail = request.requester?.email;
            slackService.notifyApprovalResult(request, req.user, executionResult, requesterEmail).catch(err =>
                console.error('[Slack] Notification failed:', err.message)
            );

            return res.json(request.toJSON());

        } else if (status === 'REJECTED') {
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'Request is not in PENDING status' });
            }

            request.status = 'REJECTED';
            request.approver = req.user;
            request.rejected_reason = rejection_reason;
            await em.flush();

            // Send Slack notification for rejection
            // Get requester email for DM
            const requester = await em.findOne(User, { id: request.requester?.id || request.requester });
            if (requester) {
                slackService.notifyRejection(request, req.user, requester.email, rejection_reason).catch(err =>
                    console.error('[Slack] Notification failed:', err.message)
                );
            }

            return res.json(request.toJSON());

        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { submitRequest, getRequests, getMySubmissions, getRequestById, updateRequest };
