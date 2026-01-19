/**
 * Validation Schemas Tests
 * Tests Zod schemas with boundary values and edge cases
 */

const {
    loginSchema,
    signupSchema,
    submitRequestSchema,
    updateRequestSchema,
    paginationSchema,
    requestFiltersSchema,
    validPodNames
} = require('../src/validators/schemas');

describe('Validation Schemas', () => {
    describe('loginSchema', () => {
        it('should accept valid login data', () => {
            const data = { email: 'test@example.com', password: 'password123' };
            const result = loginSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject invalid email format', () => {
            const data = { email: 'notanemail', password: 'password123' };
            const result = loginSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error.issues[0].message).toContain('email');
        });

        it('should reject empty email', () => {
            const data = { email: '', password: 'password123' };
            const result = loginSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject empty password', () => {
            const data = { email: 'test@example.com', password: '' };
            const result = loginSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject missing fields', () => {
            const result = loginSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('signupSchema', () => {
        it('should accept valid signup data', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                pod_name: validPodNames[0] // Use first valid pod
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept signup without pod_name', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User'
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject password less than 6 chars', () => {
            const data = {
                email: 'test@example.com',
                password: '12345',  // 5 chars
                name: 'Test'
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error.issues[0].message).toContain('6 characters');
        });

        it('should accept password exactly 6 chars (boundary)', () => {
            const data = {
                email: 'test@example.com',
                password: '123456',  // 6 chars exactly
                name: 'Test'
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject invalid pod_name', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test',
                pod_name: 'INVALID_POD'
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject empty name', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: ''
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('submitRequestSchema', () => {
        it('should accept valid QUERY submission', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT * FROM users'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept valid SCRIPT submission', () => {
            const data = {
                db_type: 'MONGODB',
                instance_name: 'mongo-db',
                database_name: 'test_db',
                submission_type: 'SCRIPT',
                comments: 'Cleanup script'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject QUERY without query_content', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
            expect(result.error.issues[0].message).toContain('required for QUERY');
        });

        it('should reject QUERY with empty query_content', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: '   '  // whitespace only
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject invalid db_type', () => {
            const data = {
                db_type: 'MYSQL',  // Invalid
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT 1'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
            // Error message format varies by Zod version
            expect(result.error.issues.length).toBeGreaterThan(0);
        });

        it('should reject invalid submission_type', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'STORED_PROCEDURE'  // Invalid
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
            // Error message format varies by Zod version
            expect(result.error.issues.length).toBeGreaterThan(0);
        });

        it('should reject empty instance_name', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: '',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT 1'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should accept valid pod_name in request', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                pod_name: validPodNames[0]
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject invalid pod_name in request', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                pod_name: 'INVALID_POD'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('updateRequestSchema', () => {
        it('should accept APPROVED status', () => {
            const data = { status: 'APPROVED' };
            const result = updateRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept REJECTED status with reason', () => {
            const data = { status: 'REJECTED', rejection_reason: 'Bad query' };
            const result = updateRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject invalid status', () => {
            const data = { status: 'PENDING' };  // Only APPROVED/REJECTED allowed
            const result = updateRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
            // Error message format varies by Zod version
            expect(result.error.issues.length).toBeGreaterThan(0);
        });

        it('should reject empty status', () => {
            const data = { status: '' };
            const result = updateRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('paginationSchema', () => {
        it('should accept valid pagination', () => {
            const data = { page: '1', limit: '10' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should apply defaults for missing values', () => {
            const data = {};
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(true);
            expect(result.data.page).toBe('1');
            expect(result.data.limit).toBe('10');
        });

        it('should reject page=0', () => {
            const data = { page: '0' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject negative page', () => {
            const data = { page: '-1' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should reject limit > 100', () => {
            const data = { limit: '101' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should accept limit = 100 (boundary)', () => {
            const data = { limit: '100' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject limit = 0', () => {
            const data = { limit: '0' };
            const result = paginationSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('requestFiltersSchema', () => {
        it('should accept valid status filter', () => {
            const data = { status: 'PENDING' };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept all valid statuses', () => {
            const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'];
            statuses.forEach(status => {
                const result = requestFiltersSchema.safeParse({ status });
                expect(result.success).toBe(true);
            });
        });

        it('should reject invalid status', () => {
            const data = { status: 'INVALID_STATUS' };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should accept date range filters', () => {
            const data = {
                start_date: '2026-01-01',
                end_date: '2026-01-31'
            };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept search filter', () => {
            const data = { search: 'SELECT' };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should accept valid pod_name filter', () => {
            const data = { pod_name: validPodNames[0] };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should reject invalid pod_name filter', () => {
            const data = { pod_name: 'INVALID_POD' };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should accept empty pod_name in filter', () => {
            const data = { pod_name: '' };
            const result = requestFiltersSchema.safeParse(data);
            // Empty string should be handled by refine
            expect(result.success).toBe(true);
        });
    });

    describe('Schema errorMap callbacks', () => {
        it('should trigger db_type errorMap for completely wrong type', () => {
            const data = {
                db_type: 12345, // number instead of string
                instance_name: 'test',
                database_name: 'test',
                submission_type: 'QUERY',
                query_content: 'SELECT 1'
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should trigger submission_type errorMap for wrong type', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test',
                database_name: 'test',
                submission_type: null
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });

        it('should trigger updateRequestSchema errorMap', () => {
            const data = { status: 12345 }; // wrong type
            const result = updateRequestSchema.safeParse(data);
            expect(result.success).toBe(false);
        });
    });

    describe('Refine function edge cases', () => {
        it('should pass pod_name refine with empty string (falsy)', () => {
            const data = {
                email: 'test@example.com',
                password: 'password123',
                name: 'Test User',
                pod_name: ''
            };
            const result = signupSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should pass submitRequest pod_name refine with empty string', () => {
            const data = {
                db_type: 'POSTGRESQL',
                instance_name: 'test-db',
                database_name: 'test_db',
                submission_type: 'QUERY',
                query_content: 'SELECT 1',
                pod_name: ''
            };
            const result = submitRequestSchema.safeParse(data);
            expect(result.success).toBe(true);
        });

        it('should validate requestFiltersSchema with empty pod_name', () => {
            const data = { pod_name: '' };
            const result = requestFiltersSchema.safeParse(data);
            expect(result.success).toBe(true);
        });
    });
});
