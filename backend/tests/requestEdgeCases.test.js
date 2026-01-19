const request = require('supertest');
const app = require('../src/app');

// This file tests edge cases for requests that require different mock behavior

// Mock the database module to provide mock EntityManager
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'tester@example.com', role: 'DEVELOPER', pod_name: 'POD_1' };
    next();
}));

// Mock upload middleware to NOT provide a file
jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => {
        req.file = null; // No file uploaded
        next();
    }
}));

// Mock validators to pass through (validation happens in controller for script file)
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next(),
    submitRequestSchema: {},
    updateRequestSchema: {},
    requestFiltersSchema: {}
}));

jest.mock('../src/services/executionService', () => ({ executeRequest: jest.fn() }));

describe('Request Edge Cases', () => {
    let mockEM;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock EntityManager
        mockEM = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    describe('POST /api/requests - SCRIPT without file', () => {
        it('should return 400 if script file is missing for SCRIPT type', async () => {
            const requestData = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-postgres',
                database_name: 'users_db',
                submission_type: 'SCRIPT',
                comments: 'Test script',
                pod_name: 'POD_1'
            };

            const res = await request(app)
                .post('/api/requests')
                .send(requestData);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Script file is required for SCRIPT submission');
        });
    });

    describe('GET /api/requests/:id - DEVELOPER access control', () => {
        it('should allow DEVELOPER to view their own request', async () => {
            const mockRequest = {
                id: 1,
                query_content: 'SELECT 1',
                status: 'PENDING',
                pod_name: 'POD_1',
                submission_type: 'QUERY',
                requester: { id: 1, name: 'Tester', email: 'tester@example.com' },
                executions: { isInitialized: () => false },
                toJSON: function () { return { id: this.id, query_content: this.query_content, status: this.status, pod_name: this.pod_name }; }
            };

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/1');

            expect(res.statusCode).toEqual(200);
        });

        it('should deny DEVELOPER access to others request', async () => {
            const mockRequest = {
                id: 2,
                query_content: 'SELECT 1',
                status: 'PENDING',
                pod_name: 'POD_1',
                submission_type: 'QUERY',
                requester: { id: 99, name: 'Other', email: 'other@example.com' }
            };

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/2');

            expect(res.statusCode).toEqual(403);
            expect(res.body.error).toContain('only view your own requests');
        });
    });

    describe('Pagination boundary values', () => {
        it('should handle page 1 correctly', async () => {
            mockEM.findAndCount.mockResolvedValue([[], 0]);

            const res = await request(app).get('/api/requests/my-submissions?page=1&limit=10');

            expect(res.statusCode).toEqual(200);
            expect(mockEM.findAndCount).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    offset: 0
                })
            );
        });

        it('should handle large page number', async () => {
            mockEM.findAndCount.mockResolvedValue([[], 0]);

            const res = await request(app).get('/api/requests/my-submissions?page=100&limit=10');

            expect(res.statusCode).toEqual(200);
            expect(mockEM.findAndCount).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    offset: 990
                })
            );
        });
    });
});
