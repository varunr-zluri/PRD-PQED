const request = require('supertest');
const app = require('../src/app');
const executionService = require('../src/services/executionService');

// Mock the database module to provide mock EntityManager
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

// Mock auth middleware to simulate Manager
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 2, email: 'manager@example.com', role: 'MANAGER', pod_name: 'POD_1' };
    next();
}));

jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => next()
}));

// Mock validators to pass through
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next(),
    submitRequestSchema: {},
    updateRequestSchema: {},
    requestFiltersSchema: {}
}));

jest.mock('../src/services/executionService', () => ({
    executeRequest: jest.fn()
}));

// Mock slackService to prevent real Slack API calls
jest.mock('../src/services/slackService', () => ({
    notifyNewSubmission: jest.fn().mockResolvedValue(undefined),
    notifyApprovalResult: jest.fn().mockResolvedValue(undefined),
    notifyRejection: jest.fn().mockResolvedValue(undefined),
    getUserByEmail: jest.fn().mockResolvedValue(null),
    sendDM: jest.fn().mockResolvedValue(true)
}));

describe('Approval Endpoints', () => {
    let mockEM;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock EntityManager
        mockEM = {
            findOne: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    describe('PATCH /api/requests/:id - Approve', () => {
        it('should approve a pending request and trigger execution', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1',
                requester: { id: 1 },
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                query_content: 'SELECT 1',
                executions: { isInitialized: () => false },
                toJSON: function () { return { id: this.id, status: this.status }; }
            };

            const mockExecution = { id: 1, status: 'SUCCESS' };

            mockEM.findOne.mockResolvedValue(mockRequest);
            mockEM.create.mockReturnValue(mockExecution);
            mockEM.persistAndFlush.mockResolvedValue(undefined);
            mockEM.flush.mockResolvedValue(undefined);
            executionService.executeRequest.mockResolvedValue({ success: true, result: [{ count: 1 }] });

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(200);
            expect(mockRequest.status).toBe('EXECUTED');
            expect(executionService.executeRequest).toHaveBeenCalledWith(mockRequest);
            expect(mockEM.create).toHaveBeenCalled();
        });

        it('should handle execution failure and set status to FAILED', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1',
                requester: { id: 1 },
                executions: { isInitialized: () => false },
                toJSON: function () { return { id: this.id, status: this.status }; }
            };

            const mockExecution = { id: 1, status: 'FAILURE' };

            mockEM.findOne.mockResolvedValue(mockRequest);
            mockEM.create.mockReturnValue(mockExecution);
            mockEM.persistAndFlush.mockResolvedValue(undefined);
            mockEM.flush.mockResolvedValue(undefined);
            executionService.executeRequest.mockResolvedValue({ success: false, error: 'Query failed' });

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(200);
            expect(mockRequest.status).toBe('FAILED');
        });

        it('should return 400 if request is already approved', async () => {
            const mockRequest = {
                id: 1,
                status: 'APPROVED', // Already approved
                pod_name: 'POD_1'
            };

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Request is already approved');
        });

        it('should return 404 if request not found', async () => {
            mockEM.findOne.mockResolvedValue(null);

            const res = await request(app)
                .patch('/api/requests/999')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toBe('Request not found');
        });
    });

    describe('PATCH /api/requests/:id - Reject', () => {
        it('should reject a pending request with reason', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1',
                requester: { id: 1 },
                executions: { isInitialized: () => false },
                toJSON: function () { return { id: this.id, status: this.status }; }
            };

            mockEM.findOne.mockResolvedValue(mockRequest);
            mockEM.flush.mockResolvedValue(undefined);

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'REJECTED', rejection_reason: 'Bad query' });

            expect(res.statusCode).toEqual(200);
            expect(mockRequest.status).toBe('REJECTED');
            expect(mockRequest.rejected_reason).toBe('Bad query');
        });

        it('should return 400 if request is not in PENDING status', async () => {
            const mockRequest = {
                id: 1,
                status: 'EXECUTED', // Already executed
                pod_name: 'POD_1'
            };

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'REJECTED', rejection_reason: 'Too late' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Request is not in PENDING status');
        });
    });

    describe('PATCH /api/requests/:id - Access Control', () => {
        it('should deny manager access to different POD request', async () => {
            const mockRequest = {
                id: 2,
                status: 'PENDING',
                pod_name: 'POD_2', // Different from manager's POD_1
                requester: { id: 3 }
            };

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app)
                .patch('/api/requests/2')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.error).toBe('You can only update requests for your POD');
        });
    });

    describe('Edge Cases', () => {
        it('should handle database error gracefully', async () => {
            mockEM.findOne.mockRejectedValue(new Error('Database connection failed'));

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(503);
            expect(res.body.error).toBe('Database connection failed');
        });

        it('should handle execution service error', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1'
            };

            mockEM.findOne.mockResolvedValue(mockRequest);
            mockEM.flush.mockResolvedValue(undefined);
            mockEM.create.mockReturnValue({});
            mockEM.persistAndFlush.mockResolvedValue(undefined);
            executionService.executeRequest.mockRejectedValue(new Error('Execution failed'));

            const res = await request(app)
                .patch('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(400);
        });
    });
});
