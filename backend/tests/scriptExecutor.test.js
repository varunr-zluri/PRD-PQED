const { executeScript } = require('../src/services/scriptExecutor');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('fs', () => ({
    existsSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    unlinkSync: jest.fn()
}));

jest.mock('vm2', () => ({
    NodeVM: jest.fn().mockImplementation(() => ({
        on: jest.fn(),
        run: jest.fn().mockReturnValue('script output')
    }))
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));

describe('Script Executor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('console.log("hello")');
    });

    it('should execute script for PostgreSQL instance', async () => {
        const instance = { type: 'POSTGRESQL', host: 'localhost', port: 5432, user: 'test', password: 'test' };
        const result = await executeScript(instance, 'testdb', '/path/to/script.js');

        expect(result).toHaveProperty('output', 'script output');
        expect(fs.writeFileSync).toHaveBeenCalled(); // Config file written
        expect(fs.unlinkSync).toHaveBeenCalled(); // Cleanup
    });

    it('should execute script for MongoDB instance', async () => {
        const instance = { type: 'MONGODB', host: 'localhost', port: 27017, user: 'mongouser', password: 'pass' };
        const result = await executeScript(instance, 'testdb', '/path/to/script.js');

        expect(result).toHaveProperty('output', 'script output');
        expect(fs.writeFileSync).not.toHaveBeenCalled(); // No config file for Mongo
    });

    it('should throw error if script file not found', async () => {
        fs.existsSync.mockReturnValue(false);

        const instance = { type: 'POSTGRESQL', host: 'localhost', port: 5432, user: 'test', password: 'test' };

        await expect(executeScript(instance, 'testdb', '/nonexistent.js'))
            .rejects.toThrow('Script file not found');
    });

    it('should handle async script result', async () => {
        const { NodeVM } = require('vm2');
        NodeVM.mockImplementation(() => ({
            on: jest.fn(),
            run: jest.fn().mockReturnValue(Promise.resolve('async result'))
        }));

        const instance = { type: 'POSTGRESQL', host: 'localhost', port: 5432, user: 'test', password: 'test' };
        const result = await executeScript(instance, 'testdb', '/path/to/script.js');

        expect(result).toHaveProperty('output', 'async result');
    });

    it('should handle MongoDB instance without auth', async () => {
        const instance = { type: 'MONGODB', host: 'localhost', port: 27017, user: '', password: '' };
        const result = await executeScript(instance, 'testdb', '/path/to/script.js');

        expect(result).toHaveProperty('output');
    });
});
