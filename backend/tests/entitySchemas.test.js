/**
 * Entity Schema Tests
 * Tests for MikroORM entity schema configurations and callbacks
 */

const { User, UserSchema, PodName, UserRole } = require('../src/entities/User.entity');
const { QueryRequest, QueryRequestSchema, DbType, SubmissionType, RequestStatus } = require('../src/entities/QueryRequest.entity');
const { QueryExecution, QueryExecutionSchema, ExecutionStatus } = require('../src/entities/QueryExecution.entity');

describe('Entity Schema Definitions', () => {
    describe('UserSchema', () => {
        it('should have table name "users"', () => {
            // Access schema metadata
            expect(UserSchema.meta.tableName).toBe('users');
        });

        it('should have required properties', () => {
            const props = UserSchema.meta.properties;
            expect(props).toHaveProperty('id');
            expect(props).toHaveProperty('email');
            expect(props).toHaveProperty('name');
            expect(props).toHaveProperty('password');
            expect(props).toHaveProperty('role');
            expect(props).toHaveProperty('pod_name');
        });

        it('should have beforeCreate hook', () => {
            expect(UserSchema.meta.hooks).toBeDefined();
            expect(UserSchema.meta.hooks.beforeCreate).toBeDefined();
            expect(UserSchema.meta.hooks.beforeCreate.length).toBeGreaterThan(0);
        });

        it('should have beforeUpdate hook', () => {
            expect(UserSchema.meta.hooks.beforeUpdate).toBeDefined();
            expect(UserSchema.meta.hooks.beforeUpdate.length).toBeGreaterThan(0);
        });

        it('should define relationships', () => {
            const props = UserSchema.meta.properties;
            expect(props).toHaveProperty('requests');
            expect(props).toHaveProperty('approvedRequests');
        });
    });

    describe('QueryRequestSchema', () => {
        it('should have table name "query_requests"', () => {
            expect(QueryRequestSchema.meta.tableName).toBe('query_requests');
        });

        it('should have all required properties', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props).toHaveProperty('id');
            expect(props).toHaveProperty('requester');
            expect(props).toHaveProperty('db_type');
            expect(props).toHaveProperty('instance_name');
            expect(props).toHaveProperty('database_name');
            expect(props).toHaveProperty('submission_type');
            expect(props).toHaveProperty('status');
            expect(props).toHaveProperty('executions');
        });

        it('should have nullable fields correctly defined', () => {
            const props = QueryRequestSchema.meta.properties;
            expect(props.query_content.nullable).toBe(true);
            expect(props.script_path.nullable).toBe(true);
            expect(props.comments.nullable).toBe(true);
            expect(props.rejected_reason.nullable).toBe(true);
        });
    });

    describe('QueryExecutionSchema', () => {
        it('should have table name "query_executions"', () => {
            expect(QueryExecutionSchema.meta.tableName).toBe('query_executions');
        });

        it('should have execution properties', () => {
            const props = QueryExecutionSchema.meta.properties;
            expect(props).toHaveProperty('id');
            expect(props).toHaveProperty('request');
            expect(props).toHaveProperty('status');
            expect(props).toHaveProperty('result_data');
            expect(props).toHaveProperty('error_message');
            expect(props).toHaveProperty('executed_at');
        });
    });

    describe('Entity class instantiation', () => {
        it('should create User with correct defaults', () => {
            const user = new User();
            expect(user.role).toBe('DEVELOPER');
            expect(user.created_at).toBeInstanceOf(Date);
        });

        it('should create QueryRequest with correct defaults', () => {
            const request = new QueryRequest();
            expect(request.status).toBe('PENDING');
            expect(request.created_at).toBeInstanceOf(Date);
        });

        it('should create QueryExecution with correct defaults', () => {
            const execution = new QueryExecution();
            expect(execution.executed_at).toBeInstanceOf(Date);
        });
    });

    describe('Enum exports', () => {
        it('should export PodName correctly', () => {
            expect(Object.values(PodName)).toContain('pod-1');
            expect(Object.values(PodName)).toContain('pod-2');
            expect(Object.values(PodName)).toContain('sre');
        });

        it('should export UserRole correctly', () => {
            expect(Object.values(UserRole)).toContain('DEVELOPER');
            expect(Object.values(UserRole)).toContain('MANAGER');
            expect(Object.values(UserRole)).toContain('ADMIN');
        });

        it('should export DbType correctly', () => {
            expect(Object.values(DbType)).toContain('POSTGRESQL');
            expect(Object.values(DbType)).toContain('MONGODB');
        });

        it('should export SubmissionType correctly', () => {
            expect(Object.values(SubmissionType)).toContain('QUERY');
            expect(Object.values(SubmissionType)).toContain('SCRIPT');
        });

        it('should export RequestStatus correctly', () => {
            expect(Object.values(RequestStatus)).toContain('PENDING');
            expect(Object.values(RequestStatus)).toContain('APPROVED');
            expect(Object.values(RequestStatus)).toContain('REJECTED');
            expect(Object.values(RequestStatus)).toContain('EXECUTED');
            expect(Object.values(RequestStatus)).toContain('FAILED');
        });

        it('should export ExecutionStatus correctly', () => {
            expect(Object.values(ExecutionStatus)).toContain('SUCCESS');
            expect(Object.values(ExecutionStatus)).toContain('FAILURE');
        });
    });
});
