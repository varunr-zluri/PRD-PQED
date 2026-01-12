const request = require('supertest');
const jwt = require('jsonwebtoken');
const { User } = require('../src/models');
const app = require('../src/app');

// Mock the models
jest.mock('../src/models', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
    queryRequest: {},
    queryExecution: {},
    sequelize: {
        authenticate: jest.fn(),
        sync: jest.fn(),
    }
}));

describe('Authentication Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/signup', () => {
        it('should create a new user for valid data', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                pod_name: 'Pod 1'
            };

            User.findOne.mockResolvedValue(null);
            User.create.mockResolvedValue({
                id: 1,
                ...userData,
                role: 'DEVELOPER',
                toJSON: () => ({ id: 1, email: userData.email, name: userData.name, role: 'DEVELOPER' }) // Mock user.toJSON
            });

            const res = await request(app)
                .post('/api/auth/signup')
                .send(userData);

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('message', 'User registered successfully. Please login.');
            expect(res.body.user).toHaveProperty('email', userData.email);
        });

        it('should return 400 if email already exists', async () => {
            const userData = {
                email: 'existing@example.com',
                password: 'password123',
                name: 'Existing User'
            };

            User.findOne.mockResolvedValue({ id: 2, email: userData.email });

            const res = await request(app)
                .post('/api/auth/signup')
                .send(userData);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'User with this email already exists, try logging in');
        });

        it('Should return 400 if details are not valid or missing', async ()=>{
            const userData = {
                email: '',
                password: '',
                name: ''
            }

            const res = await request(app)
                .post('/api/auth/signup')
                .send(userData);

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('error', 'Email, password, and name are required');
        })
    });

    describe('POST /api/auth/login', () => {
        it('should login successfully with correct credentials', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'password123'
            };

            const mockUser = {
                id: 1,
                email: loginData.email,
                role: 'DEVELOPER',
                checkPassword: jest.fn().mockResolvedValue(true),
                toJSON: () => ({ id: 1, email: loginData.email, role: 'DEVELOPER' })
            };

            User.findOne.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user).toHaveProperty('email', loginData.email);
        });

        it('should return 401 for incorrect password', async () => {
            const loginData = {
                email: 'test@example.com',
                password: 'wrongpassword'
            };

            const mockUser = {
                id: 1,
                email: loginData.email,
                checkPassword: jest.fn().mockResolvedValue(false)
            };

            User.findOne.mockResolvedValue(mockUser);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('error', 'Invalid login credentials');
        });

        it('should return 401 for non-existent user', async () => {
            const loginData = {
                email: 'notfound@example.com',
                password: 'password123'
            };

            User.findOne.mockResolvedValue(null);

            const res = await request(app)
                .post('/api/auth/login')
                .send(loginData);

            expect(res.statusCode).toEqual(401);
            expect(res.body).toHaveProperty('error', 'Invalid login credentials');
        });
    });
});
