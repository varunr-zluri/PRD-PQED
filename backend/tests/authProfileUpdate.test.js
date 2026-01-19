/**
 * Auth Controller - Profile Update Tests
 * Dedicated tests for profile update functionality
 */

const request = require('supertest');
const app = require('../src/app');

// Mock database
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

// Create a mock user object for profile update tests
const mockUpdateUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    username: 'testuser',
    role: 'DEVELOPER',
    pod_name: 'POD_1',
    password: 'hashedpass',
    toJSON: function () {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            username: this.username,
            role: this.role,
            pod_name: this.pod_name
        };
    }
};

// Mock auth middleware to inject test user
jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = {
        ...mockUpdateUser,
        toJSON: mockUpdateUser.toJSON.bind(mockUpdateUser)
    };
    next();
}));

// Mock validators
jest.mock('../src/validators', () => ({
    validateBody: () => (req, res, next) => next(),
    validateQuery: () => (req, res, next) => next()
}));

describe('Auth Controller - Profile Update', () => {
    let mockEM;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEM = {
            findOne: jest.fn(),
            flush: jest.fn().mockResolvedValue(undefined),
            persistAndFlush: jest.fn().mockResolvedValue(undefined),
            create: jest.fn()
        };
        getEM.mockReturnValue(mockEM);

        // Reset mock user for each test
        mockUpdateUser.username = 'testuser';
        mockUpdateUser.name = 'Test User';
    });

    describe('PATCH /api/auth/profile', () => {
        it('should update username when available', async () => {
            mockEM.findOne.mockResolvedValue(null); // Username not taken

            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ username: 'newusername' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Profile updated successfully');
        });

        it('should return 400 when username is already taken', async () => {
            // Return existing user with same username
            mockEM.findOne.mockResolvedValue({ id: 2, username: 'takenname' });

            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ username: 'takenname' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Username already taken');
        });

        it('should update name successfully', async () => {
            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ name: 'New Name' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Profile updated successfully');
        });

        it('should update password successfully', async () => {
            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ password: 'newpassword123' });

            expect(res.statusCode).toEqual(200);
            expect(res.body.message).toBe('Profile updated successfully');
        });

        it('should update multiple fields at once', async () => {
            mockEM.findOne.mockResolvedValue(null); // Username not taken

            const res = await request(app)
                .patch('/api/auth/profile')
                .send({
                    username: 'newuser',
                    name: 'New Name',
                    password: 'newpass'
                });

            expect(res.statusCode).toEqual(200);
        });

        it('should handle database error gracefully', async () => {
            mockEM.flush.mockRejectedValue(new Error('Database error'));

            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ name: 'Error Test' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Database error');
        });

        it('should not update username if same as current', async () => {
            // Set current username
            mockUpdateUser.username = 'currentname';

            const res = await request(app)
                .patch('/api/auth/profile')
                .send({ username: 'currentname' });

            expect(res.statusCode).toEqual(200);
            // findOne should not be called since username is same
            expect(mockEM.findOne).not.toHaveBeenCalled();
        });
    });
});
