const { executePostgresQuery } = require('../src/services/postgresExecutor');
const { Client } = require('pg');

jest.mock('pg', () => ({
    Client: jest.fn()
}));

jest.mock('../src/utils/cloudStorage', () => ({
    uploadString: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/raw/upload/test.csv')
}));

describe('Postgres Executor', () => {
    let mockClient;

    beforeEach(() => {
        mockClient = {
            connect: jest.fn().mockResolvedValue(true),
            query: jest.fn(),
            end: jest.fn().mockResolvedValue(true)
        };
        Client.mockImplementation(() => mockClient);
    });

    it('should execute query and return result object with rows', async () => {
        const mockRows = [{ id: 1, name: 'Test' }];
        mockClient.query
            .mockResolvedValueOnce() // SET statement_timeout
            .mockResolvedValueOnce({ rows: mockRows }); // actual query

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test' };
        const result = await executePostgresQuery(instance, 'testdb', 'SELECT * FROM users');

        // New response format includes truncation info
        expect(result).toHaveProperty('rows', mockRows);
        expect(result).toHaveProperty('is_truncated', false);
        expect(result).toHaveProperty('total_rows', 1);
        expect(result).toHaveProperty('result_file_path', null);
        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockClient.end).toHaveBeenCalled();
    });

    it('should close connection even on error', async () => {
        mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test' };

        await expect(executePostgresQuery(instance, 'testdb', 'BAD QUERY')).rejects.toThrow('Query failed');
        expect(mockClient.end).toHaveBeenCalled();
    });

    it('should truncate results when over 100 rows and save CSV', async () => {
        // Generate 150 mock rows
        const mockRows = Array.from({ length: 150 }, (_, i) => ({ id: i + 1, name: `User${i + 1}` }));
        mockClient.query
            .mockResolvedValueOnce() // SET statement_timeout
            .mockResolvedValueOnce({ rows: mockRows }); // actual query

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test' };
        const result = await executePostgresQuery(instance, 'testdb', 'SELECT * FROM users');

        expect(result.is_truncated).toBe(true);
        expect(result.total_rows).toBe(150);
        expect(result.rows).toHaveLength(100); // Truncated to 100
        expect(result.result_file_path).not.toBeNull();
    });

    it('should handle SSL configuration explicitly set', async () => {
        const mockRows = [{ id: 1 }];
        mockClient.query
            .mockResolvedValueOnce() // SET statement_timeout
            .mockResolvedValueOnce({ rows: mockRows });

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test', ssl: false };
        const result = await executePostgresQuery(instance, 'testdb', 'SELECT 1');

        expect(result.rows).toEqual(mockRows);
    });
});

