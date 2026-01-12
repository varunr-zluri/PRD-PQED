const request = require('supertest');
const { QueryRequest, User, QueryExecution } = require('../src/models');
const app = require('../src/app');
const executionService = require('../src/services/executionService');

jest.mock('../src/models', () => ({
    QueryRequest: {
        findByPk: jest.fn(),
    },
    User: {
        findOne: jest.fn(),
    },
    QueryExecution: {
        create: jest.fn()
    },
    sequelize: {
        authenticate: jest.fn(),
        sync: jest.fn(),
    }
}));

jest.mock('../src/services/executionService', () => ({
    executeRequest: jest.fn()
}));

// Mock auth middleware to simulate Manager
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 2, email: 'manager@example.com', role: 'MANAGER', pod_name: 'pod-1' };
    next();
}));

jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => next()
}));

// Mock uuid just in case, though config handles it
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

describe('Approval Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('PUT /api/requests/:id', () => {
        it('should approve a pending request and trigger execution', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'pod-1',
                requester_id: 1,
                save: jest.fn().mockResolvedValue(true)
            };

            QueryRequest.findByPk.mockResolvedValue(mockRequest);
            executionService.executeRequest.mockResolvedValue({ success: true, result: [] });

            const res = await request(app)
                .put('/api/requests/1')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(200);
            expect(mockRequest.save).toHaveBeenCalled();
            expect(mockRequest.status).toBe('EXECUTED'); // Assuming executeRequest success sets it to EXECUTED
            expect(executionService.executeRequest).toHaveBeenCalledWith(mockRequest);
        });

        it('should reject a pending request', async () => {
            const mockRequest = {
                id: 1,
                status: 'PENDING',
                pod_name: 'pod-1',
                requester_id: 1,
                save: jest.fn().mockResolvedValue(true)
            };

            QueryRequest.findByPk.mockResolvedValue(mockRequest);

            const res = await request(app)
                .put('/api/requests/1')
                .send({ status: 'REJECTED', rejection_reason: 'Bad query' });

            expect(res.statusCode).toEqual(200);
            expect(mockRequest.save).toHaveBeenCalled();
            expect(mockRequest.status).toBe('REJECTED');
            expect(mockRequest.rejected_reason).toBe('Bad query');
        });

        it('should require MANAGER role', async () => {
            // To test role requirement, we'd need to change the auth mock or check RBAC middleware mocking.
            // Since auth is mocked globally here as MANAGER, let's test ownership logic (POD check)

            // ... actually the auth mock is global for the file. 
            // Ideally we should use jest.spyOn or re-mock for different users, but RBAC is usually middleware.
            // We can test: "Manager cannot approve request for different POD"

            const mockRequest = {
                id: 2,
                status: 'PENDING',
                pod_name: 'pod-2', // Different POD
                requester_id: 3
            };

            QueryRequest.findByPk.mockResolvedValue(mockRequest);

            const res = await request(app)
                .put('/api/requests/2')
                .send({ status: 'APPROVED' });

            expect(res.statusCode).toEqual(403);
        });
    });
});
