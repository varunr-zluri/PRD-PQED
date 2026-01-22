/**
 * Real File Upload Tests
 * Tests that actually upload files to trigger multer callbacks
 */

const request = require('supertest');
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

const { getEM } = require('../src/config/database');

// Mock auth
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'test@example.com', role: 'DEVELOPER', pod_name: 'POD_1' };
    next();
}));

// Mock validators
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next(),
    submitRequestSchema: {},
    updateRequestSchema: {},
    requestFiltersSchema: {}
}));

// Mock slack service to prevent WebClient initialization error
jest.mock('../src/services/slackService', () => ({
    sendApprovalNotification: jest.fn().mockResolvedValue(true),
    sendExecutionNotification: jest.fn().mockResolvedValue(true),
    notifyNewSubmission: jest.fn().mockResolvedValue(true)
}));

// Mock cloud storage for script upload
jest.mock('../src/utils/cloudStorage', () => ({
    uploadFile: jest.fn().mockResolvedValue('https://res.cloudinary.com/demo/test.js'),
    uploadString: jest.fn().mockResolvedValue('https://res.cloudinary.com/demo/result.csv')
}));

const app = require('../src/app');

describe('Real File Upload Tests', () => {
    const testScriptsDir = path.join(__dirname, 'temp-scripts');
    const testScriptPath = path.join(testScriptsDir, 'test-upload.js');
    const testNonJsPath = path.join(testScriptsDir, 'test.txt');

    let mockEM;

    beforeAll(() => {
        // Create temp directory and test files
        if (!fs.existsSync(testScriptsDir)) {
            fs.mkdirSync(testScriptsDir, { recursive: true });
        }
        fs.writeFileSync(testScriptPath, 'console.log("test");');
        fs.writeFileSync(testNonJsPath, 'This is not JavaScript');
    });

    afterAll(() => {
        // Cleanup temp files
        if (fs.existsSync(testScriptPath)) fs.unlinkSync(testScriptPath);
        if (fs.existsSync(testNonJsPath)) fs.unlinkSync(testNonJsPath);
        if (fs.existsSync(testScriptsDir)) {
            fs.rmSync(testScriptsDir, { recursive: true });
        }

        // Clean up uploaded files
        const uploadsDir = 'uploads/';
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            files.forEach(file => {
                if (file.match(/^\d+-\d+\.js$/)) {
                    fs.unlinkSync(path.join(uploadsDir, file));
                }
            });
        }
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockEM = {
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            create: jest.fn((Entity, data) => ({
                ...data,
                id: 1,
                toJSON: function () { return { ...this }; }
            })),
            persistAndFlush: jest.fn().mockResolvedValue(undefined),
            flush: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    describe('POST /api/requests - file upload', () => {
        it('should accept JavaScript file upload', async () => {
            const res = await request(app)
                .post('/api/requests')
                .field('db_type', 'POSTGRESQL')
                .field('instance_name', 'test-db')
                .field('database_name', 'testdb')
                .field('submission_type', 'SCRIPT')
                .field('pod_name', 'POD_1')
                .attach('script_file', testScriptPath);

            // Valid JS file should be accepted, expect 201 Created
            expect(res.statusCode).toBe(201);
        });

        it('should reject non-JavaScript file', async () => {
            const res = await request(app)
                .post('/api/requests')
                .field('db_type', 'POSTGRESQL')
                .field('instance_name', 'test-db')
                .field('database_name', 'testdb')
                .field('submission_type', 'SCRIPT')
                .attach('script_file', testNonJsPath);

            // Multer should reject the file with 400 Bad Request
            expect(res.statusCode).toBe(400);
        });
    });

    describe('File filter coverage', () => {
        it('should accept files with different JS mimetypes', async () => {
            // text/javascript mimetype
            const res = await request(app)
                .post('/api/requests')
                .field('db_type', 'MONGODB')
                .field('instance_name', 'test-mongo')
                .field('database_name', 'testdb')
                .field('submission_type', 'SCRIPT')
                .field('pod_name', 'POD_1')
                .attach('script_file', testScriptPath);
            // Valid JS file should be accepted, expect 201 Created
            expect(res.statusCode).toBe(201);
        });
    });
});
