const { QueryRequest, User, QueryExecution } = require('../models');
const { Op } = require('sequelize');
const executionService = require('../services/executionService');

const submitRequest = async (req, res) => {
    try {
        const {
            db_type,
            instance_name,
            database_name,
            submission_type,
            query_content,
            comments,
            pod_name // Renamed from pod_id
        } = req.body;

        const requestData = {
            requester_id: req.user.id, // Renamed from user_id
            db_type,
            instance_name,
            database_name,
            submission_type,
            comments,
            pod_name, // Renamed from pod_id
            status: 'PENDING'
        };

        if (submission_type === 'QUERY') {
            if (!query_content) {
                return res.status(400).json({ error: 'Query content is required for QUERY submission' });
            }
            requestData.query_content = query_content;
        } else if (submission_type === 'SCRIPT') {
            if (!req.file) {
                return res.status(400).json({ error: 'Script file is required for SCRIPT submission' });
            }
            requestData.script_path = req.file.path; // Renamed from script_path
        }

        const request = await QueryRequest.create(requestData);
        res.status(201).json(request);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

// Helper to build where clause for filtering
const buildWhereClause = (query) => {
    const {
        status,
        pod_name,
        start_date,
        end_date,
        search,
        db_type,
        submission_type,
        database_name,
        requester_id,
        approver_id
    } = query;

    const whereClause = {};

    if (status) whereClause.status = status;
    if (pod_name) whereClause.pod_name = pod_name;
    if (db_type) whereClause.db_type = db_type;
    if (submission_type) whereClause.submission_type = submission_type;
    if (database_name) whereClause.database_name = database_name;
    if (requester_id) whereClause.requester_id = requester_id;
    if (approver_id) whereClause.approver_id = approver_id;

    if (start_date && end_date) {
        whereClause.created_at = {
            [Op.between]: [new Date(start_date), new Date(end_date)]
        };
    }

    if (search) {
        whereClause[Op.or] = [
            { query_content: { [Op.iLike]: `%${search}%` } },
            { comments: { [Op.iLike]: `%${search}%` } }
        ];
    }

    return whereClause;
};

const getRequests = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = buildWhereClause(req.query);

        // Role-based filtering: 
        if (req.user.role === 'MANAGER' && req.user.pod_name) {
            // Compare User.pod_name (e.g., 'de') with QueryRequest.pod_name (e.g., 'de')
            whereClause.pod_name = req.user.pod_name;
        }

        const { count, rows } = await QueryRequest.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'approver', attributes: ['id', 'name', 'email'] }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            requests: rows,
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMySubmissions = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const whereClause = buildWhereClause(req.query);
        whereClause.requester_id = req.user.id; // Enforce user ownership

        const { count, rows } = await QueryRequest.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            requests: rows,
            total: count,
            page: parseInt(page),
            pages: Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getRequestById = async (req, res) => {
    try {
        const request = await QueryRequest.findByPk(req.params.id, {
            include: [
                { model: User, as: 'requester', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'approver', attributes: ['id', 'name', 'email'] },
                { model: QueryExecution, as: 'executions' } // Include executions
            ]
        });

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Access control:
        // (Optional: restrict if not requester or manager/admin)

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const approveRequest = async (req, res) => {
    try {
        const request = await QueryRequest.findByPk(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Request is not in PENDING status' });
        }

        // RBAC: Check if manager belongs to the same POD
        if (req.user.role === 'MANAGER' && req.user.pod_id !== request.pod_name) {
            return res.status(403).json({ error: 'You can only approve requests for your POD' });
        }

        // Update status to APPROVED
        request.status = 'APPROVED';
        request.approver_id = req.user.id;
        request.approved_at = new Date();
        await request.save();

        // Trigger Execution (Async)
        const executionResult = await executionService.executeRequest(request);

        let executionStatus = 'FAILURE';
        if (executionResult.success) {
            request.status = 'EXECUTED';
            executionStatus = 'SUCCESS';
        } else {
            request.status = 'FAILED';
        }

        // Create Execution Record
        await QueryExecution.create({
            query_request_id: request.id,
            status: executionStatus,
            result_data: executionResult.success ? JSON.stringify(executionResult.result) : null,
            error_message: executionResult.success ? null : executionResult.error,
            executed_at: new Date()
        });

        await request.save();

        res.json(request);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const { rejection_reason } = req.body;
        const request = await QueryRequest.findByPk(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        if (request.status !== 'PENDING') {
            return res.status(400).json({ error: 'Request is not in PENDING status' });
        }

        // RBAC: Check if manager belongs to the same POD
        if (req.user.role === 'MANAGER' && req.user.pod_id !== request.pod_name) {
            return res.status(403).json({ error: 'You can only reject requests for your POD' });
        }

        request.status = 'REJECTED';
        request.approver_id = req.user.id;
        request.rejected_reason = rejection_reason;
        await request.save();

        res.json(request);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRequest = async (req, res) => {
    try {
        const { status, rejection_reason } = req.body;
        const request = await QueryRequest.findByPk(req.params.id);

        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // RBAC: Check if manager belongs to the same POD
        if (req.user.role === 'MANAGER' && req.user.pod_id !== request.pod_name) {
            return res.status(403).json({ error: 'You can only update requests for your POD' });
        }

        if (status === 'APPROVED') {
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'Request is not in PENDING status' });
            }

            // Update status to APPROVED
            request.status = 'APPROVED';
            request.approver_id = req.user.id;
            request.approved_at = new Date();
            await request.save();

            // Trigger Execution
            const executionResult = await executionService.executeRequest(request);

            let executionStatus = 'FAILURE';
            if (executionResult.success) {
                request.status = 'EXECUTED';
                executionStatus = 'SUCCESS';
            } else {
                request.status = 'FAILED';
            }

            // Create Execution Record
            await QueryExecution.create({
                query_request_id: request.id,
                status: executionStatus,
                result_data: executionResult.success ? JSON.stringify(executionResult.result) : null,
                error_message: executionResult.success ? null : executionResult.error,
                executed_at: new Date()
            });

            await request.save();
            return res.json(request);

        } else if (status === 'REJECTED') {
            if (request.status !== 'PENDING') {
                return res.status(400).json({ error: 'Request is not in PENDING status' });
            }

            request.status = 'REJECTED';
            request.approver_id = req.user.id;
            request.rejected_reason = rejection_reason;
            await request.save();
            return res.json(request);

        } else {
            return res.status(400).json({ error: 'Invalid status. Only APPROVED or REJECTED allowed.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    submitRequest,
    getRequests,
    getMySubmissions,
    getRequestById,
    approveRequest,
    rejectRequest,
    updateRequest
};
