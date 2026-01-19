/**
 * Request Controller Extended Tests
 * Tests for additional code paths including script reading and ADMIN access
 */

const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');

// Mock the database module
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

// Mock auth as ADMIN for some tests
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    // Default to ADMIN for these tests
    req.user = { id: 1, email: 'admin@example.com', role: 'ADMIN', pod_name: null };
    next();
}));

jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => {
        req.file = { path: 'uploads/scripts/test-script.js', filename: 'test-script.js' };
        next();
    }
}));

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

describe('Request Controller Extended Tests', () => {
    let mockEM;

    // Helper to create properly mocked request objects
    const createMockRequest = (props) => ({
        ...props,
        executions: { isInitialized: () => false, getItems: () => [] },
        toJSON: function () {
            const { executions, toJSON, ...rest } = this;
            return rest;
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockEM = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    describe('GET /api/requests/:id - ADMIN access', () => {
        it('should allow ADMIN to view any request regardless of POD', async () => {
            const mockRequest = createMockRequest({
                id: 1,
                query_content: 'SELECT 1',
                status: 'PENDING',
                pod_name: 'POD_2',
                submission_type: 'QUERY',
                requester: { id: 99, name: 'Other User', email: 'other@test.com' }
            });

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/1');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('id', 1);
        });
    });

    describe('GET /api/requests/:id - SCRIPT type with content', () => {
        it('should include script_content for SCRIPT type requests', async () => {
            // Create a temporary test script file
            const testScriptDir = path.resolve(__dirname, '../uploads/scripts');
            const testScriptPath = path.join(testScriptDir, 'admin-test-script.js');

            // Ensure directory exists
            if (!fs.existsSync(testScriptDir)) {
                fs.mkdirSync(testScriptDir, { recursive: true });
            }

            // Create test script file
            const scriptContent = 'console.log("test script");';
            fs.writeFileSync(testScriptPath, scriptContent);

            try {
                const mockRequest = createMockRequest({
                    id: 1,
                    status: 'PENDING',
                    pod_name: 'POD_1',
                    submission_type: 'SCRIPT',
                    script_path: testScriptPath,
                    requester: { id: 1, name: 'Tester', email: 'test@test.com' }
                });

                mockEM.findOne.mockResolvedValue(mockRequest);

                const res = await request(app).get('/api/requests/1');

                expect(res.statusCode).toEqual(200);
                expect(res.body).toHaveProperty('script_content', scriptContent);
                expect(res.body).toHaveProperty('script_filename', 'admin-test-script.js');
            } finally {
                // Cleanup
                if (fs.existsSync(testScriptPath)) {
                    fs.unlinkSync(testScriptPath);
                }
            }
        });

        it('should return null for script_content if file does not exist', async () => {
            const mockRequest = createMockRequest({
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1',
                submission_type: 'SCRIPT',
                script_path: '/nonexistent/path/script.js',
                requester: { id: 1, name: 'Tester', email: 'test@test.com' }
            });

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/1');

            expect(res.statusCode).toEqual(200);
            expect(res.body.script_content).toBeNull();
        });

        it('should block path traversal attempts', async () => {
            const mockRequest = createMockRequest({
                id: 1,
                status: 'PENDING',
                pod_name: 'POD_1',
                submission_type: 'SCRIPT',
                script_path: '../../../etc/passwd',  // Path traversal attempt
                requester: { id: 1, name: 'Tester', email: 'test@test.com' }
            });

            mockEM.findOne.mockResolvedValue(mockRequest);

            const res = await request(app).get('/api/requests/1');

            expect(res.statusCode).toEqual(200);
            // Path traversal should be blocked, returning null
            expect(res.body.script_content).toBeNull();
        });
    });

    describe('GET /api/requests - ADMIN list access', () => {
        it('should return all requests for ADMIN without POD filter', async () => {
            const mockRequests = [
                createMockRequest({ id: 1, pod_name: 'POD_1', requester: { id: 1, name: 'U1', email: 'u1@test.com' } }),
                createMockRequest({ id: 2, pod_name: 'POD_2', requester: { id: 2, name: 'U2', email: 'u2@test.com' } })
            ];

            mockEM.findAndCount.mockResolvedValue([mockRequests, 2]);

            const res = await request(app).get('/api/requests');

            expect(res.statusCode).toEqual(200);
            expect(res.body.requests).toHaveLength(2);
        });
    });

    describe('Approver info in responses', () => {
        it('should include approver info when present', async () => {
            const mockRequests = [
                createMockRequest({
                    id: 1,
                    status: 'APPROVED',
                    requester: { id: 1, name: 'Requester', email: 'req@test.com' },
                    approver: { id: 2, name: 'Approver', email: 'app@test.com' }
                })
            ];

            mockEM.findAndCount.mockResolvedValue([mockRequests, 1]);

            const res = await request(app).get('/api/requests');

            expect(res.statusCode).toEqual(200);
            expect(res.body.requests[0]).toHaveProperty('approver');
            expect(res.body.requests[0].approver).toHaveProperty('name', 'Approver');
        });
    });

    describe('My Submissions error handling', () => {
        it('should handle database error in getMySubmissions', async () => {
            mockEM.findAndCount.mockRejectedValue(new Error('Database unavailable'));

            const res = await request(app).get('/api/requests/my-submissions');

            expect(res.statusCode).toEqual(500);
            expect(res.body.error).toBe('Database unavailable');
        });
    });
});
