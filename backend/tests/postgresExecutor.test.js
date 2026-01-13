const { executePostgresQuery } = require('../src/services/postgresExecutor');
const { Client } = require('pg');

jest.mock('pg', () => ({
    Client: jest.fn()
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

    it('should execute query and return rows', async () => {
        const mockRows = [{ id: 1, name: 'Test' }];
        mockClient.query
            .mockResolvedValueOnce() // SET statement_timeout
            .mockResolvedValueOnce({ rows: mockRows }); // actual query

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test' };
        const result = await executePostgresQuery(instance, 'testdb', 'SELECT * FROM users');

        expect(result).toEqual(mockRows);
        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockClient.end).toHaveBeenCalled();
    });

    it('should close connection even on error', async () => {
        mockClient.query.mockRejectedValueOnce(new Error('Query failed'));

        const instance = { host: 'localhost', port: 5432, user: 'test', password: 'test' };

        await expect(executePostgresQuery(instance, 'testdb', 'BAD QUERY')).rejects.toThrow('Query failed');
        expect(mockClient.end).toHaveBeenCalled();
    });
});
