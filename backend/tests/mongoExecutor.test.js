const { executeMongoQuery } = require('../src/services/mongoExecutor');
const mongoose = require('mongoose');

// Mock mongoose.mongo.MongoClient
jest.mock('mongoose', () => ({
    mongo: {
        MongoClient: jest.fn()
    }
}));

jest.mock('../src/utils/cloudStorage', () => ({
    uploadString: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/raw/upload/test.csv')
}));

describe('Mongo Executor', () => {
    let mockClient, mockCollection, mockDb;

    beforeEach(() => {
        mockCollection = {
            find: jest.fn().mockReturnValue({
                maxTimeMS: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([{ name: 'doc1' }])
                })
            }),
            findOne: jest.fn().mockResolvedValue({ name: 'doc1' }),
            aggregate: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue([{ count: 10 }])
            }),
            insertOne: jest.fn().mockResolvedValue({ insertedId: '123' })
        };
        mockDb = { collection: jest.fn().mockReturnValue(mockCollection) };
        mockClient = {
            connect: jest.fn().mockResolvedValue(true),
            db: jest.fn().mockReturnValue(mockDb),
            close: jest.fn().mockResolvedValue(true)
        };
        mongoose.mongo.MongoClient.mockImplementation(() => mockClient);
    });

    it('should execute find query and return result object', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.find({})');

        // New response format includes truncation info
        expect(result).toHaveProperty('rows');
        expect(result).toHaveProperty('is_truncated', false);
        expect(result).toHaveProperty('total_rows', 1);
        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockClient.close).toHaveBeenCalled();
    });

    it('should execute findOne query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.findOne({name: "test"})');

        // findOne returns single doc style response
        expect(result).toHaveProperty('rows');
    });

    it('should execute aggregate query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.aggregate([])');

        expect(result).toHaveProperty('rows');
    });

    it('should throw error for invalid query format', async () => {
        const instance = { host: 'localhost', port: 27017 };

        await expect(executeMongoQuery(instance, 'testdb', 'SELECT * FROM users'))
            .rejects.toThrow('Invalid MongoDB query format');
    });

    it('should throw error for unsupported method', async () => {
        mockCollection.unsupportedMethod = undefined;
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };

        await expect(executeMongoQuery(instance, 'testdb', 'db.users.unsupportedMethod({})'))
            .rejects.toThrow('Method unsupportedMethod not supported on collection');
    });

    it('should handle connection without auth', async () => {
        const instance = { host: 'localhost', port: 27017, user: '', password: '' };
        await executeMongoQuery(instance, 'testdb', 'db.users.find({})');

        expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should truncate results when over 100 rows', async () => {
        // Generate 150 mock rows
        const mockRows = Array.from({ length: 150 }, (_, i) => ({ id: i + 1 }));
        mockCollection.find.mockReturnValue({
            maxTimeMS: jest.fn().mockReturnValue({
                toArray: jest.fn().mockResolvedValue(mockRows)
            })
        });

        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.find({})');

        expect(result.is_truncated).toBe(true);
        expect(result.total_rows).toBe(150);
        expect(result.rows).toHaveLength(100);
        expect(result.result_file_path).not.toBeNull();
    });

    it('should use connectionString if provided', async () => {
        const instance = { connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net' };
        await executeMongoQuery(instance, 'testdb', 'db.users.find({})');

        expect(mockClient.connect).toHaveBeenCalled();
    });

    it('should execute insertOne query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.insertOne({name: "test"})');

        expect(result).toHaveProperty('rows');
    });
});

