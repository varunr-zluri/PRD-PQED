/**
 * CSV Controller Tests
 * Tests for downloadCSV and getExecutionDetails
 */

const request = require('supertest');
const app = require('../src/app');
const fs = require('fs');
const path = require('path');

// Mock database
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

// Mock auth as DEVELOPER
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'DEVELOPER', pod_name: 'POD_1' };
    next();
}));

// Mock validator
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next()
}));

// Mock file upload
jest.mock('../src/utils/fileUpload', () => ({
    single: () => (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

describe('CSV Controller', () => {
    let mockEM;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEM = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn(),
            persistAndFlush: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    describe('GET /api/requests/:id/csv - downloadCSV', () => {
        it('should return 404 when execution not found', async () => {
            mockEM.findOne.mockResolvedValue(null);

            const res = await request(app).get('/api/requests/1/csv');

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toBe('Execution not found for this request');
        });

        it('should return 400 when result was not truncated', async () => {
            mockEM.findOne.mockResolvedValue({
                is_truncated: false,
                result_file_path: null
            });

            const res = await request(app).get('/api/requests/1/csv');

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toContain('not truncated');
        });

        it('should return 404 when result_file_path is null', async () => {
            mockEM.findOne.mockResolvedValue({
                is_truncated: true,
                result_file_path: null
            });

            const res = await request(app).get('/api/requests/1/csv');

            expect(res.statusCode).toEqual(404);
            expect(res.body.message).toContain('not available');
        });

        it('should return 410 when file has expired', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60); // 60 days ago

            mockEM.findOne.mockResolvedValue({
                is_truncated: true,
                result_file_path: '/some/path.csv',
                created_at: oldDate
            });

            const res = await request(app).get('/api/requests/1/csv');

            expect(res.statusCode).toEqual(410);
            expect(res.body.reason).toContain('30 days');
        });

        it('should return 410 when file does not exist on disk', async () => {
            mockEM.findOne.mockResolvedValue({
                is_truncated: true,
                result_file_path: '/nonexistent/path.csv',
                created_at: new Date() // Fresh date
            });

            const res = await request(app).get('/api/requests/1/csv');

            expect(res.statusCode).toEqual(410);
            expect(res.body.message).toContain('no longer available');
        });

        it('should stream CSV file when all conditions met', async () => {
            // Create temp CSV file
            const tempDir = path.join(__dirname, '../uploads/csv');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, 'test-download.csv');
            fs.writeFileSync(tempFile, 'id,name\n1,Test\n');

            try {
                mockEM.findOne.mockResolvedValue({
                    is_truncated: true,
                    result_file_path: tempFile,
                    created_at: new Date()
                });

                const res = await request(app).get('/api/requests/1/csv');

                expect(res.statusCode).toEqual(200);
                expect(res.headers['content-type']).toContain('text/csv');
            } finally {
                // Cleanup
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }
        });
    });

    describe('getExecutionDetails helper', () => {
        it('should return execution details with csv_available', async () => {
            // Create temp file for testing
            const tempDir = path.join(__dirname, '../uploads/csv');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, 'exec-detail-test.csv');
            fs.writeFileSync(tempFile, 'test data');

            try {
                const mockExecution = {
                    id: 1,
                    status: 'SUCCESS',
                    executed_at: new Date(),
                    is_truncated: true,
                    total_rows: 150,
                    result_data: [{ id: 1 }],
                    result_file_path: tempFile,
                    created_at: new Date(),
                    error_message: null
                };

                mockEM.findOne.mockResolvedValue(mockExecution);

                // Test via getRequestById with include=execution
                const mockRequest = {
                    id: 1,
                    status: 'EXECUTED',
                    pod_name: 'POD_1',
                    requester: { id: 1 },
                    executions: {
                        isInitialized: () => true,
                        getItems: () => [mockExecution]
                    },
                    toJSON: function () { return { id: this.id, status: this.status }; }
                };

                mockEM.findOne.mockResolvedValue(mockRequest);

                const res = await request(app).get('/api/requests/1?include=execution');

                expect(res.statusCode).toEqual(200);
                // csv_available is inside the executions array
                expect(res.body).toHaveProperty('executions');
                expect(res.body.executions[0]).toHaveProperty('csv_available');
            } finally {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }
        });
    });

    describe('GET /api/requests/:id/execution - getExecutionDetails', () => {
        it('should return 404 when execution not found', async () => {
            mockEM.findOne.mockResolvedValue(null);

            const res = await request(app).get('/api/requests/999/execution');

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toBe('Execution not found');
        });

        it('should return execution details with csv_available true when file exists', async () => {
            const tempDir = path.join(__dirname, '../uploads/csv');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const tempFile = path.join(tempDir, 'exec-details-test.csv');
            fs.writeFileSync(tempFile, 'id,name\n1,Test');

            try {
                const mockExecution = {
                    id: 1,
                    status: 'SUCCESS',
                    executed_at: new Date(),
                    is_truncated: true,
                    total_rows: 150,
                    result_data: [{ id: 1 }],
                    result_file_path: tempFile,
                    created_at: new Date(),
                    error_message: null
                };

                mockEM.findOne.mockResolvedValue(mockExecution);

                const res = await request(app).get('/api/requests/1/execution');

                expect(res.statusCode).toEqual(200);
                expect(res.body.csv_available).toBe(true);
                expect(res.body.csv_expired).toBe(false);
                expect(res.body.is_truncated).toBe(true);
                expect(res.body.total_rows).toBe(150);
            } finally {
                if (fs.existsSync(tempFile)) {
                    fs.unlinkSync(tempFile);
                }
            }
        });

        it('should return csv_expired true when file is past retention date', async () => {
            const oldDate = new Date();
            oldDate.setDate(oldDate.getDate() - 60);

            const mockExecution = {
                id: 1,
                status: 'SUCCESS',
                executed_at: new Date(),
                is_truncated: true,
                total_rows: 150,
                result_data: [{ id: 1 }],
                result_file_path: '/some/old/file.csv',
                created_at: oldDate,
                error_message: null
            };

            mockEM.findOne.mockResolvedValue(mockExecution);

            const res = await request(app).get('/api/requests/1/execution');

            expect(res.statusCode).toEqual(200);
            expect(res.body.csv_expired).toBe(true);
            expect(res.body.csv_available).toBe(false);
        });

        it('should return csv_available false when file does not exist', async () => {
            const mockExecution = {
                id: 1,
                status: 'SUCCESS',
                executed_at: new Date(),
                is_truncated: true,
                total_rows: 150,
                result_data: [{ id: 1 }],
                result_file_path: '/nonexistent/file.csv',
                created_at: new Date(),
                error_message: null
            };

            mockEM.findOne.mockResolvedValue(mockExecution);

            const res = await request(app).get('/api/requests/1/execution');

            expect(res.statusCode).toEqual(200);
            expect(res.body.csv_available).toBe(false);
        });

        it('should return null expires_at for non-truncated results', async () => {
            const mockExecution = {
                id: 1,
                status: 'SUCCESS',
                executed_at: new Date(),
                is_truncated: false,
                total_rows: 50,
                result_data: [{ id: 1 }],
                result_file_path: null,
                created_at: new Date(),
                error_message: null
            };

            mockEM.findOne.mockResolvedValue(mockExecution);

            const res = await request(app).get('/api/requests/1/execution');

            expect(res.statusCode).toEqual(200);
            expect(res.body.expires_at).toBeNull();
            expect(res.body.is_truncated).toBe(false);
        });

        it('should handle database error gracefully', async () => {
            mockEM.findOne.mockRejectedValue(new Error('Database connection failed'));

            const res = await request(app).get('/api/requests/1/execution');

            expect(res.statusCode).toEqual(500);
            expect(res.body.error).toBe('Database connection failed');
        });
    });
});
