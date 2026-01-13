const { executeMongoQuery } = require('../src/services/mongoExecutor');
const mongoose = require('mongoose');

// Mock mongoose.mongo.MongoClient
jest.mock('mongoose', () => ({
    mongo: {
        MongoClient: jest.fn()
    }
}));

describe('Mongo Executor', () => {
    let mockClient, mockCollection, mockDb;

    beforeEach(() => {
        mockCollection = {
            find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ name: 'doc1' }]) }),
            findOne: jest.fn().mockResolvedValue({ name: 'doc1' }),
            aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ count: 10 }]) }),
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

    it('should execute find query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.find({})');

        expect(result).toEqual([{ name: 'doc1' }]);
        expect(mockClient.connect).toHaveBeenCalled();
        expect(mockClient.close).toHaveBeenCalled();
    });

    it('should execute findOne query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.findOne({name: "test"})');

        expect(result).toEqual({ name: 'doc1' });
    });

    it('should execute aggregate query', async () => {
        const instance = { host: 'localhost', port: 27017, user: 'user', password: 'pass' };
        const result = await executeMongoQuery(instance, 'testdb', 'db.users.aggregate([])');

        expect(result).toEqual([{ count: 10 }]);
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
});
