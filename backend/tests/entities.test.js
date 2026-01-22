/**
 * Entity Tests
 * Tests for MikroORM entity classes - constructors, methods, toJSON
 */

const bcrypt = require('bcryptjs');
const { User, UserRole, PodName } = require('../src/entities/User.entity');
const { QueryRequest, SubmissionType, DbType, RequestStatus } = require('../src/entities/QueryRequest.entity');
const { QueryExecution, ExecutionStatus } = require('../src/entities/QueryExecution.entity');

describe('Entity Classes', () => {
    describe('User Entity', () => {
        it('should create user with default values', () => {
            const user = new User();

            expect(user.id).toBeUndefined();
            expect(user.role).toBe(UserRole.DEVELOPER);
            expect(user.created_at).toBeInstanceOf(Date);
            expect(user.updated_at).toBeInstanceOf(Date);
        });

        it('should have correct checkPassword method', async () => {
            const user = new User();
            user.password = await bcrypt.hash('testpass', 10);

            const result = await user.checkPassword('testpass');
            expect(result).toBe(true);
        });

        it('should return false for wrong password', async () => {
            const user = new User();
            user.password = await bcrypt.hash('testpass', 10);

            const result = await user.checkPassword('wrongpass');
            expect(result).toBe(false);
        });

        it('should have correct toJSON output', () => {
            const user = new User();
            user.id = 1;
            user.email = 'test@example.com';
            user.name = 'Test User';
            user.password = 'hashed_password';
            user.pod_name = 'pod-1';
            user.role = 'DEVELOPER';

            const json = user.toJSON();

            expect(json).toHaveProperty('id', 1);
            expect(json).toHaveProperty('email', 'test@example.com');
            expect(json).toHaveProperty('name', 'Test User');
            expect(json).toHaveProperty('pod_name', 'pod-1');
            expect(json).toHaveProperty('role', 'DEVELOPER');
            expect(json).not.toHaveProperty('password'); // Password excluded
        });

        it('should expose UserRole enum', () => {
            expect(UserRole.DEVELOPER).toBe('DEVELOPER');
            expect(UserRole.MANAGER).toBe('MANAGER');
            expect(UserRole.ADMIN).toBe('ADMIN');
        });

        it('should expose PodName enum', () => {
            expect(PodName.POD_1).toBe('pod-1');
            expect(PodName.POD_2).toBe('pod-2');
            expect(PodName.POD_3).toBe('pod-3');
            expect(PodName.SRE).toBe('sre');
            expect(PodName.DE).toBe('de');
        });
    });

    describe('QueryRequest Entity', () => {
        it('should create request with default values', () => {
            const request = new QueryRequest();

            expect(request.id).toBeUndefined();
            expect(request.status).toBe(RequestStatus.PENDING);
            expect(request.created_at).toBeInstanceOf(Date);
            expect(request.updated_at).toBeInstanceOf(Date);
        });

        it('should expose SubmissionType enum', () => {
            expect(SubmissionType.QUERY).toBe('QUERY');
            expect(SubmissionType.SCRIPT).toBe('SCRIPT');
        });

        it('should expose DbType enum', () => {
            expect(DbType.POSTGRESQL).toBe('POSTGRESQL');
            expect(DbType.MONGODB).toBe('MONGODB');
        });

        it('should expose RequestStatus enum', () => {
            expect(RequestStatus.PENDING).toBe('PENDING');
            expect(RequestStatus.APPROVED).toBe('APPROVED');
            expect(RequestStatus.REJECTED).toBe('REJECTED');
            expect(RequestStatus.EXECUTED).toBe('EXECUTED');
            expect(RequestStatus.FAILED).toBe('FAILED');
        });

        it('should have correct toJSON output with null approver (line 55)', () => {
            const request = new QueryRequest();
            request.id = 1;
            request.db_type = DbType.POSTGRESQL;
            request.instance_name = 'postgres-prod';
            request.database_name = 'testdb';
            request.submission_type = SubmissionType.QUERY;
            request.query_content = 'SELECT 1';
            request.pod_name = 'pod-1';
            request.requester = null; // No requester
            request.approver = null; // No approver

            const json = request.toJSON();

            expect(json.id).toBe(1);
            expect(json.db_type).toBe(DbType.POSTGRESQL);
            expect(json.requester).toBeNull();
            expect(json.approver).toBeNull();
        });

        it('should have correct toJSON output with populated approver', () => {
            const request = new QueryRequest();
            request.id = 2;
            request.db_type = DbType.MONGODB;
            request.instance_name = 'mongo-prod';
            request.database_name = 'orders';
            request.submission_type = SubmissionType.SCRIPT;
            request.script_path = 'http://example.com/script.js';
            request.pod_name = 'sre';
            request.requester = { id: 1, name: 'Developer' };
            request.approver = { id: 2, name: 'Manager' };

            const json = request.toJSON();

            expect(json.id).toBe(2);
            expect(json.requester).toEqual({ id: 1, name: 'Developer' });
            expect(json.approver).toEqual({ id: 2, name: 'Manager' });
        });
    });

    describe('QueryExecution Entity', () => {
        it('should create execution with default values', () => {
            const execution = new QueryExecution();

            expect(execution.id).toBeUndefined();
            expect(execution.executed_at).toBeInstanceOf(Date);
        });

        it('should expose ExecutionStatus enum', () => {
            expect(ExecutionStatus.SUCCESS).toBe('SUCCESS');
            expect(ExecutionStatus.FAILURE).toBe('FAILURE');
        });
    });
});
