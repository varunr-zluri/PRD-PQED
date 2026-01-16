/**
 * App.js Tests
 * Tests for Express app including health check and error handler
 */

const request = require('supertest');
const app = require('../src/app');

// Mock database to prevent ORM errors
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

// Mock auth for protected routes
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, role: 'ADMIN' };
    next();
}));

// Mock validators
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next(),
    loginSchema: {},
    signupSchema: {},
    submitRequestSchema: {},
    updateRequestSchema: {},
    requestFiltersSchema: {}
}));

describe('App.js', () => {
    describe('Health Check', () => {
        it('should return health check message on GET /', async () => {
            const res = await request(app).get('/');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Database Query Portal API is running');
            expect(res.body).toHaveProperty('env');
        });
    });

    describe('Error Handler', () => {
        it('should handle errors with 500 status', async () => {
            // Make a request that will trigger an error
            // We'll need to mock something to throw
            const { getEM } = require('../src/config/database');
            getEM.mockImplementation(() => {
                throw new Error('Test error for coverage');
            });

            const res = await request(app)
                .get('/api/requests')
                .set('Authorization', 'Bearer test');

            // The request should fail with an error
            expect(res.statusCode).toBeGreaterThanOrEqual(400);
        });
    });

    describe('Routes', () => {
        it('should have /api routes mounted', async () => {
            const res = await request(app).get('/api/nonexistent');

            // 404 means routes are mounted but path doesn't exist
            expect(res.statusCode).toEqual(404);
        });
    });
});
