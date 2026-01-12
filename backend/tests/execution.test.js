const executionService = require('../src/services/executionService');
const postgresExecutor = require('../src/services/postgresExecutor');
const mongoExecutor = require('../src/services/mongoExecutor');
const scriptExecutor = require('../src/services/scriptExecutor');

// Mock dependencies
jest.mock('../src/services/postgresExecutor', () => ({
    executePostgresQuery: jest.fn()
}));

jest.mock('../src/services/mongoExecutor', () => ({
    executeMongoQuery: jest.fn()
}));

jest.mock('../src/services/scriptExecutor', () => ({
    executeScript: jest.fn()
}));

jest.mock('../src/config/databases', () => ({
    databases: [
        { name: 'pg-prod', type: 'POSTGRESQL', credentials_encrypted: 'xxx' },
        { name: 'mongo-prod', type: 'MONGODB', credentials_encrypted: 'yyy' }
    ]
}));

describe('Execution Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should execute Postgres query successfully', async () => {
        const request = {
            id: 1,
            submission_type: 'QUERY',
            db_type: 'POSTGRESQL',
            instance_name: 'pg-prod',
            database_name: 'users',
            query_content: 'SELECT * FROM users'
        };

        postgresExecutor.executePostgresQuery.mockResolvedValue(['user1', 'user2']);

        const result = await executionService.executeRequest(request);

        expect(result).toEqual({ success: true, result: ['user1', 'user2'] });
        expect(postgresExecutor.executePostgresQuery).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'pg-prod', type: 'POSTGRESQL' }),
            'users',
            'SELECT * FROM users'
        );
    });

    it('should execute MongoDB query successfully', async () => {
        const request = {
            id: 2,
            submission_type: 'QUERY',
            db_type: 'MONGODB',
            instance_name: 'mongo-prod',
            database_name: 'logs',
            query_content: '{ find: "logs" }'
        };

        mongoExecutor.executeMongoQuery.mockResolvedValue([{ log: 'test' }]);

        const result = await executionService.executeRequest(request);

        expect(result).toEqual({ success: true, result: [{ log: 'test' }] });
        expect(mongoExecutor.executeMongoQuery).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'mongo-prod', type: 'MONGODB' }),
            'logs',
            '{ find: "logs" }'
        );
    });

    it('should execute Script successfully', async () => {
        const request = {
            id: 3,
            submission_type: 'SCRIPT',
            db_type: 'POSTGRESQL',
            instance_name: 'pg-prod',
            database_name: 'users',
            script_path: '/path/to/script.js'
        };

        scriptExecutor.executeScript.mockResolvedValue('Script Output');

        const result = await executionService.executeRequest(request);

        expect(result).toEqual({ success: true, result: 'Script Output' });
        expect(scriptExecutor.executeScript).toHaveBeenCalledWith(
            expect.objectContaining({ name: 'pg-prod', type: 'POSTGRESQL' }),
            'users',
            '/path/to/script.js'
        );
    });

    it('should fail if instance not found', async () => {
        const request = {
            id: 4,
            submission_type: 'QUERY',
            db_type: 'POSTGRESQL',
            instance_name: 'unknown-db', // Does not exist in mocked config
            database_name: 'users',
            query_content: 'SELECT 1'
        };

        const result = await executionService.executeRequest(request);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not found in configuration');
    });

    it('should handle executor errors', async () => {
        const request = {
            id: 5,
            submission_type: 'QUERY',
            db_type: 'POSTGRESQL',
            instance_name: 'pg-prod',
            database_name: 'users',
            query_content: 'SELECT * FROM users'
        };

        postgresExecutor.executePostgresQuery.mockRejectedValue(new Error('Connection Failed'));

        const result = await executionService.executeRequest(request);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Connection Failed');
    });
});
