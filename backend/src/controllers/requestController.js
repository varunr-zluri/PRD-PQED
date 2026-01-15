const { QueryRequest, User, QueryExecution } = require('../entities');
const { getEM } = require('../config/database');
const executionService = require('../services/executionService');

const submitRequest = async (req, res) => {
    try {
        const { db_type, instance_name, database_name, submission_type, query_content, comments, pod_name } = req.body;
        const em = getEM();

        const requestData = {
            requester: req.user,
            db_type,
            instance_name,
            database_name,
            submission_type,
            comments,
            pod_name,
            status: 'PENDING'
        };

        if (submission_type === 'QUERY') {
            requestData.query_content = query_content;
        } else if (submission_type === 'SCRIPT') {
            if (!req.file) {
                return res.status(400).json({ error: 'Script file is required for SCRIPT submission' });
            }
            requestData.script_path = req.file.path;
        }

        const request = em.create(QueryRequest, requestData);
        await em.persistAndFlush(request);

        res.status(201).json(request);
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
        whereClause.created_at = {
            $gte: new Date(start_date),
            $lte: new Date(end_date)
        };
    }

    if (search) {
        whereClause.$or = [
            { query_content: { $like: `%${search}%` } },
            { comments: { $like: `%${search}%` } }
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

        // Transform results to include only needed user fields
        const requests = rows.map(r => {
            const obj = { ...r };
            if (r.requester) {
                obj.requester = { id: r.requester.id, name: r.requester.name, email: r.requester.email };
            }
            if (r.approver) {
                obj.approver = { id: r.approver.id, name: r.approver.name, email: r.approver.email };
            }
            return obj;
        });

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

        res.json({ requests: rows, total: count, page: parseInt(page), pages: Math.ceil(count / limit) });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getRequestById = async (req, res) => {
    try {
        const em = getEM();
        const request = await em.findOne(QueryRequest, { id: parseInt(req.params.id) }, {
            populate: ['requester', 'approver', 'executions']
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Access control based on role
        if (req.user.role === 'ADMIN') {
            // ADMIN can see all requests
            const result = { ...request };
            if (request.requester) {
                result.requester = { id: request.requester.id, name: request.requester.name, email: request.requester.email };
            }
            if (request.approver) {
                result.approver = { id: request.approver.id, name: request.approver.name, email: request.approver.email };
            }
            return res.json(result);
        }

        if (req.user.role === 'MANAGER') {
            // MANAGER can only see requests from their POD
            if (request.pod_name !== req.user.pod_name) {
                return res.status(403).json({ error: 'Access denied. Request belongs to a different POD.' });
            }
            const result = { ...request };
            if (request.requester) {
                result.requester = { id: request.requester.id, name: request.requester.name, email: request.requester.email };
            }
            if (request.approver) {
                result.approver = { id: request.approver.id, name: request.approver.name, email: request.approver.email };
            }
            return res.json(result);
        }

        // DEVELOPER can only see their own requests
        const requesterId = request.requester?.id || request.requester;
        if (requesterId !== req.user.id) {
            return res.status(403).json({ error: 'Access denied. You can only view your own requests.' });
        }

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRequest = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const em = getEM();
        const request = await em.findOne(QueryRequest, { id: parseInt(req.params.id) });

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

            const execution = em.create(QueryExecution, {
                request: request,
                status: executionStatus,
                result_data: executionResult.success ? JSON.stringify(executionResult.result) : null,
                error_message: executionResult.success ? null : executionResult.error,
                executed_at: new Date()
            });

            await em.persistAndFlush(execution);
            return res.json(request);

        } else if (status === 'REJECTED') {
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'Request is not in PENDING status' });
            }

            request.status = 'REJECTED';
            request.approver = req.user;
            request.rejected_reason = rejection_reason;
            await em.flush();
            return res.json(request);

        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { submitRequest, getRequests, getMySubmissions, getRequestById, updateRequest };
