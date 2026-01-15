const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');
const { requireRole, requirePodAccess } = require('../src/middleware/rbac');
const { User } = require('../src/models');
const config = require('../src/config/env');

// Mock models
jest.mock('../src/models', () => ({
    User: {
        findByPk: jest.fn()
    },
    sequelize: { authenticate: jest.fn(), sync: jest.fn() }
}));

describe('Auth Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = { header: jest.fn() };
        mockRes = { status: jest.fn().mockReturnThis(), send: jest.fn() };
        mockNext = jest.fn();
    });

    it('should authenticate with valid token', async () => {
        const mockUser = { id: 1, email: 'test@example.com', role: 'DEVELOPER' };
        const token = jwt.sign({ id: 1 }, config.jwt.secret);

        mockReq.header.mockReturnValue(`Bearer ${token}`);
        User.findByPk.mockResolvedValue(mockUser);

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
        User.findByPk.mockResolvedValue(null);

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
        it('should allow if not a manager', async () => {
            mockReq = { user: { role: 'DEVELOPER' } };

            await requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow manager with pod_name', async () => {
            mockReq = { user: { role: 'MANAGER', pod_name: 'pod-1' } };

            await requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should deny manager without pod_name', async () => {
            mockReq = { user: { role: 'MANAGER', pod_name: null } };

            await requirePodAccess(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ error: 'Manager requires Pod assignment' });
        });
    });
});
