const request = require('supertest');
const app = require('../src/app');

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'tester@example.com', role: 'DEVELOPER' };
    next();
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('Pod Controller', () => {
    describe('GET /api/pods', () => {
        it('should return list of pods', async () => {
            const res = await request(app).get('/api/pods');

            expect(res.statusCode).toEqual(200);
            expect(Array.isArray(res.body)).toBe(true);
        });
    });
});
