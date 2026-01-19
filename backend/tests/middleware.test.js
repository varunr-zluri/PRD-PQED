const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');
const { requireRole, requirePodAccess, requireListAccess } = require('../src/middleware/rbac');
const config = require('../src/config/env');

// Mock the database module
jest.mock('../src/config/database', () => ({
    getEM: jest.fn(),
    initORM: jest.fn(),
    closeORM: jest.fn(),
    getORM: jest.fn(() => ({ em: {} })),
    ormMiddleware: (req, res, next) => next()
}));

const { getEM } = require('../src/config/database');

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext, mockEM;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { header: jest.fn() };
        mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        mockNext = jest.fn();

        // Setup mock EntityManager
        mockEM = {
            findOne: jest.fn()
        };
        getEM.mockReturnValue(mockEM);
    });

    it('should authenticate with valid token', async () => {
        const mockUser = { id: 1, email: 'test@example.com', role: 'DEVELOPER' };
        const token = jwt.sign({ id: 1 }, config.jwt.secret);

        mockReq.header.mockReturnValue(`Bearer ${token}`);
        mockEM.findOne.mockResolvedValue(mockUser);

        await auth(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockReq.user).toEqual(mockUser);
    });

    it('should reject if no token provided', async () => {
        mockReq.header.mockReturnValue(undefined);

        await auth(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.send).toHaveBeenCalledWith({ error: 'Please authenticate.' });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if token is invalid', async () => {
        mockReq.header.mockReturnValue('Bearer invalidtoken');

        await auth(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject if user not found', async () => {
        const token = jwt.sign({ id: 999 }, config.jwt.secret);
        mockReq.header.mockReturnValue(`Bearer ${token}`);
        mockEM.findOne.mockResolvedValue(null);

        await auth(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
        const expiredToken = jwt.sign({ id: 1 }, config.jwt.secret, { expiresIn: '-1h' });
        mockReq.header.mockReturnValue(`Bearer ${expiredToken}`);

        await auth(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle token without Bearer prefix', async () => {
        const token = jwt.sign({ id: 1 }, config.jwt.secret);
        mockReq.header.mockReturnValue(token); // No "Bearer " prefix

        const mockUser = { id: 1, email: 'test@example.com' };
        mockEM.findOne.mockResolvedValue(mockUser);

        await auth(mockReq, mockRes, mockNext);

        // Should still work since replace('Bearer ', '') handles this
        expect(mockNext).toHaveBeenCalled();
    });

    it('should handle database error during user lookup', async () => {
        const token = jwt.sign({ id: 1 }, config.jwt.secret);
        mockReq.header.mockReturnValue(`Bearer ${token}`);
        mockEM.findOne.mockRejectedValue(new Error('DB Error'));

        await auth(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockNext).not.toHaveBeenCalled();
    });
});

describe('RBAC Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        mockNext = jest.fn();
    });

    describe('requireRole', () => {
        it('should allow if role matches', () => {
            mockReq = { user: { role: 'MANAGER' } };
            const middleware = requireRole('MANAGER');

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow if role is one of multiple allowed', () => {
            mockReq = { user: { role: 'ADMIN' } };
            const middleware = requireRole('MANAGER', 'ADMIN');

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should deny if role does not match', () => {
            mockReq = { user: { role: 'DEVELOPER' } };
            const middleware = requireRole('MANAGER');

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied. Insufficient permissions.' });
        });

        it('should deny if no user', () => {
            mockReq = {};
            const middleware = requireRole('MANAGER');

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        });
    });

    describe('requirePodAccess', () => {
        it('should allow if not a manager', () => {
            mockReq = { user: { role: 'DEVELOPER' } };

            requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow manager with pod_name', () => {
            mockReq = { user: { role: 'MANAGER', pod_name: 'POD_1' } };

            requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should deny manager without pod_name', () => {
            mockReq = { user: { role: 'MANAGER', pod_name: null } };

            requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Manager requires Pod assignment' });
        });

        it('should allow ADMIN regardless of pod_name', () => {
            mockReq = { user: { role: 'ADMIN', pod_name: null } };

            requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('requireListAccess', () => {
        it('should allow ADMIN', () => {
            mockReq = { user: { role: 'ADMIN' } };

            requireListAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow MANAGER with pod_name', () => {
            mockReq = { user: { role: 'MANAGER', pod_name: 'POD_1' } };

            requireListAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should deny MANAGER without pod_name', () => {
            mockReq = { user: { role: 'MANAGER', pod_name: null } };

            requireListAccess(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
        });

        it('should deny DEVELOPER', () => {
            mockReq = { user: { role: 'DEVELOPER' } };

            requireListAccess(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Access denied. Use /my-submissions to view your requests.' });
        });

        it('should deny if no user', () => {
            mockReq = {};

            requireListAccess(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
});
