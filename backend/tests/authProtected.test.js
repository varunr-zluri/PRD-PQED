const request = require('supertest');
const app = require('../src/app');

// This file tests protected auth routes by mocking auth middleware

jest.mock('../src/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        findByPk: jest.fn()
    },
    QueryRequest: {
        create: jest.fn(),
        findAndCountAll: jest.fn(),
        findByPk: jest.fn()
    },
    QueryExecution: { create: jest.fn() },
    sequelize: { authenticate: jest.fn(), sync: jest.fn() }
}));

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = {
        id: 1,
        email: 'test@example.com',
        name: 'Tester',
        role: 'DEVELOPER',
        toJSON: () => ({ id: 1, email: 'test@example.com', name: 'Tester', role: 'DEVELOPER' })
    };
    req.token = 'test-token';
    next();
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
jest.mock('mongoose', () => ({ mongo: { MongoClient: jest.fn() } }));
jest.mock('vm2', () => ({ NodeVM: jest.fn(), VM: jest.fn() }));

describe('Protected Auth Routes', () => {
    describe('POST /api/auth/logout', () => {
        it('should logout successfully', async () => {
            const res = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', 'Bearer test-token');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('message', 'Logged out successfully');
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return current user profile', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer test-token');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('email', 'test@example.com');
            expect(res.body).toHaveProperty('name', 'Tester');
        });
    });
});
