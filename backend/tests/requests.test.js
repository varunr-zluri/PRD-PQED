const request = require('supertest');
const { QueryRequest, User, QueryExecution } = require('../src/models');
const app = require('../src/app');
const auth = require('../src/middleware/auth');
const upload = require('../src/utils/fileUpload');
const executionService = require('../src/services/executionService');

// Mock dependencies
jest.mock('../src/models', () => ({
    QueryRequest: {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
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

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'tester@example.com', role: 'DEVELOPER', pod_name: 'pod-1' };
    next();
}));

jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => {
        req.file = { path: 'uploads/test-script.js', filename: 'test-script.js' };
        next();
    }
}));

jest.mock('../src/services/executionService', () => ({
    executeRequest: jest.fn()
}));

// Mock uuid just in case, though config handles it
jest.mock('uuid', () => ({
    v4: () => 'test-uuid-1234'
}));

describe('Request Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/requests', () => {
        it('should create a QUERY request successfully', async () => {
            const requestData = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-postgres',
                database_name: 'users_db',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users',
                comments: 'test',
                pod_name: 'pod-1'
            };

            QueryRequest.create.mockResolvedValue({
                id: 1,
                ...requestData,
                requester_id: 1,
                status: 'PENDING',
                toJSON: () => ({ id: 1, ...requestData, status: 'PENDING' })
            });

            const res = await request(app)
                .post('/api/requests')
                .send(requestData);

            expect(res.statusCode).toEqual(201);
            expect(QueryRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                submission_type: 'QUERY',
                query_content: requestData.query_content
            }));
        });

        it('should create a SCRIPT request successfully', async () => {
            // Since we mock upload middleware to always provide a file, we can just send fields
            const requestData = {
                db_type: 'MONGODB',
                instance_name: 'mongo-cluster',
                database_name: 'logs',
                submission_type: 'SCRIPT',
                comments: 'Cleanup script',
                pod_name: 'pod-2'
            };

            QueryRequest.create.mockResolvedValue({
                id: 2,
                ...requestData,
                requester_id: 1,
                status: 'PENDING',
                script_path: 'uploads/test-script.js'
            });

            const res = await request(app)
                .post('/api/requests')
                .send(requestData);

            expect(res.statusCode).toEqual(201);
            expect(QueryRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                submission_type: 'SCRIPT',
                script_path: 'uploads/test-script.js'
            }));
        });
    });

    describe('GET /api/requests', () => {
        it('should return a list of requests', async () => {
            const mockRequests = [
                { id: 1, query_content: 'SELECT 1', status: 'PENDING' },
                { id: 2, query_content: 'SELECT 2', status: 'APPROVED' }
            ];

            QueryRequest.findAndCountAll.mockResolvedValue({
                count: 2,
                rows: mockRequests
            });

            const res = await request(app).get('/api/requests');

            expect(res.statusCode).toEqual(200);
            expect(res.body.requests).toHaveLength(2);
            expect(res.body.total).toEqual(2);
        });

        it('should apply filters', async () => {
            QueryRequest.findAndCountAll.mockResolvedValue({
                count: 0,
                rows: []
            });

            await request(app).get('/api/requests?status=PENDING&db_type=POSTGRESQL');

            expect(QueryRequest.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    status: 'PENDING',
                    db_type: 'POSTGRESQL'
                })
            }));
        });
    });

    describe('GET /api/requests/my-submissions', () => {
        it('should return only user submissions', async () => {
            QueryRequest.findAndCountAll.mockResolvedValue({
                count: 1,
                rows: [{ id: 1, requester_id: 1 }]
            });

            // Mock user role to match requirement if checking role, but auth mock sets user.id=1

            const res = await request(app).get('/api/requests/my-submissions');

            expect(res.statusCode).toEqual(200);
            expect(QueryRequest.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    requester_id: 1
                })
            }));
        });
    });

    describe('GET /api/requests/:id', () => {
        it('should return request by id', async () => {
            const mockRequest = {
                id: 1,
                query_content: 'SELECT 1',
                status: 'PENDING',
                requester: { id: 1, name: 'Tester' }
            };

            QueryRequest.findByPk.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/1');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', 1);
        });

        it('should return 404 if request not found', async () => {
            QueryRequest.findByPk.mockResolvedValue(null);

            const res = await request(app).get('/api/requests/999');

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Request not found');
        });
    });

    describe('POST /api/requests - validation', () => {
        it('should return 400 if query content missing for QUERY type', async () => {
            const requestData = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-postgres',
                database_name: 'users_db',
                submission_type: 'QUERY',
                query_content: '', // Empty
                pod_name: 'pod-1'
            };

            const res = await request(app)
                .post('/api/requests')
                .send(requestData);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Query content is required for QUERY submission');
        });
    });

    describe('GET /api/requests - date range filter', () => {
        it('should filter by date range', async () => {
            QueryRequest.findAndCountAll.mockResolvedValue({
                count: 0,
                rows: []
            });

            await request(app).get('/api/requests?start_date=2026-01-01&end_date=2026-01-31');

            expect(QueryRequest.findAndCountAll).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    created_at: expect.any(Object)
                })
            }));
        });

        it('should filter by search term', async () => {
            QueryRequest.findAndCountAll.mockResolvedValue({
                count: 0,
                rows: []
            });

            await request(app).get('/api/requests?search=SELECT');

            expect(QueryRequest.findAndCountAll).toHaveBeenCalled();
        });
    });
});
