const request = require('supertest');
const app = require('../src/app');

// This file tests edge cases for requests that require different mock behavior

jest.mock('../src/models', () => ({
    QueryRequest: {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findByPk: jest.fn()
    },
    User: { findOne: jest.fn() },
    QueryExecution: { create: jest.fn() },
    sequelize: { authenticate: jest.fn(), sync: jest.fn() }
}));

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
    updateRequestSchema: {}
}));

jest.mock('../src/services/executionService', () => ({ executeRequest: jest.fn() }));
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('mongoose', () => ({ mongo: { MongoClient: jest.fn() } }));
jest.mock('vm2', () => ({ NodeVM: jest.fn(), VM: jest.fn() }));

describe('Request Edge Cases', () => {
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
});
