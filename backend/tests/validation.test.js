/**
 * Validation Middleware Tests
 * Tests the validateBody and validateQuery middleware functions
 */

const { validateBody, validateQuery } = require('../src/validators');
const { z } = require('zod');

describe('Validation Middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { body: {}, query: {} };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    describe('validateBody', () => {
        const testSchema = z.object({
            email: z.string().email(),
            age: z.number().min(18)
        });

        it('should call next() for valid body', () => {
            mockReq.body = { email: 'test@example.com', age: 25 };
            const middleware = validateBody(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should return 400 for invalid body', () => {
            mockReq.body = { email: 'invalid', age: 15 };
            const middleware = validateBody(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.any(String)
            }));
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return validation error message', () => {
            mockReq.body = { email: 'notanemail', age: 25 };
            const middleware = validateBody(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            // Error should contain field name or validation message
            expect(mockRes.json).toHaveBeenCalled();
        });

        it('should handle missing required fields', () => {
            mockReq.body = {};
            const middleware = validateBody(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle extra fields (schema should strip them)', () => {
            mockReq.body = { email: 'test@example.com', age: 25, extra: 'field' };
            const middleware = validateBody(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('validateQuery', () => {
        const testSchema = z.object({
            page: z.string().regex(/^\d+$/).optional(),
            limit: z.string().regex(/^\d+$/).optional()
        });

        it('should call next() for valid query params', () => {
            mockReq.query = { page: '1', limit: '10' };
            const middleware = validateQuery(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 400 for invalid query params', () => {
            mockReq.query = { page: 'abc', limit: 'xyz' };
            const middleware = validateQuery(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle empty query', () => {
            mockReq.query = {};
            const middleware = validateQuery(testSchema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Error formatting', () => {
        it('should format multiple validation errors', () => {
            const schema = z.object({
                email: z.string().email(),
                password: z.string().min(6),
                name: z.string().min(1)
            });
            mockReq.body = { email: 'bad', password: 'ab', name: '' };
            const middleware = validateBody(schema);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });
    });
});
