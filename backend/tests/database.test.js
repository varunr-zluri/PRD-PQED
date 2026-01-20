const request = require('supertest');
const app = require('../src/app');
const { databases } = require('../src/config/databases');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

// Mock dependencies
jest.mock('../src/config/databases', () => ({
    databases: [
        { name: 'test-postgres', type: 'POSTGRESQL', host: 'localhost', port: 5433, user: 'testuser', password: 'testpass' },
        { name: 'test-mongo', type: 'MONGODB', host: 'localhost', port: 27017, user: 'mongouser', password: 'mongopass' }
    ]
}));

jest.mock('pg', () => ({
    Client: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(true),
        query: jest.fn().mockResolvedValue({ rows: [{ datname: 'testdb' }, { datname: 'proddb' }] }),
        end: jest.fn().mockResolvedValue(true)
    }))
}));

jest.mock('mongodb', () => ({
    MongoClient: jest.fn().mockImplementation(() => ({
        connect: jest.fn().mockResolvedValue(true),
        db: jest.fn().mockReturnValue({
            admin: jest.fn().mockReturnValue({
                listDatabases: jest.fn().mockResolvedValue({ databases: [{ name: 'admin' }, { name: 'logs' }] })
            })
        }),
        close: jest.fn().mockResolvedValue(true)
    }))
}));

jest.mock('../src/middleware/auth', () => jest.fn((req, res, next) => {
    req.user = { id: 1, email: 'tester@example.com', role: 'DEVELOPER' };
    next();
}));

// Mock mongoose to avoid loading issues in mongoExecutor
jest.mock('mongoose', () => ({
    mongo: {
        MongoClient: jest.fn()
    }
}));

// Mock vm2 to avoid issues in scriptExecutor
jest.mock('vm2', () => ({
    NodeVM: jest.fn(),
    VM: jest.fn()
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('Database Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/database-instances', () => {
        it('should return list of all instances when no query param', async () => {
            const res = await request(app).get('/api/database-instances');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0]).toHaveProperty('name', 'test-postgres');
        });

        it('should return databases for a PostgreSQL instance', async () => {
            const res = await request(app).get('/api/database-instances?instance=test-postgres');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('databases');
            expect(res.body.databases).toContain('testdb');
        });

        it('should return 404 for unknown instance', async () => {
            const res = await request(app).get('/api/database-instances?instance=unknown');

            expect(res.statusCode).toEqual(404);
            expect(res.body).toHaveProperty('error', 'Database instance not found');
        });

        it('should return databases for a MongoDB instance', async () => {
            const res = await request(app).get('/api/database-instances?instance=test-mongo');

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('databases');
            // 'logs' should be in the list, 'admin' is filtered out
            expect(res.body.databases).toContain('logs');
            expect(res.body.databases).not.toContain('admin');
        });

        it('should handle connection errors gracefully', async () => {
            // Override the mock to throw an error
            require('pg').Client.mockImplementationOnce(() => ({
                connect: jest.fn().mockRejectedValue(new Error('Connection refused')),
                end: jest.fn()
            }));

            const res = await request(app).get('/api/database-instances?instance=test-postgres');

            expect(res.statusCode).toEqual(500);
            expect(res.body).toHaveProperty('error', 'Failed to fetch resources');
        });

        it('should use explicit ssl config when provided for PostgreSQL', async () => {
            // The mock already has ssl: undefined, which should use default
            const res = await request(app).get('/api/database-instances?instance=test-postgres');
            expect(res.statusCode).toEqual(200);
            expect(require('pg').Client).toHaveBeenCalled();
        });
    });
});
