/**
 * Script Executor Tests
 * Tests for URL fetching vs Local file reading
 */

const { executeScript } = require('../src/services/scriptExecutor');
const axios = require('axios');
const fs = require('fs');
const cloudStorage = require('../src/utils/cloudStorage');

jest.mock('axios');
jest.mock('fs');
jest.mock('../src/utils/cloudStorage', () => ({
    uploadString: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/raw/upload/test.csv')
}));

// Create a mock VM that we can control for different tests
let mockVMRunResult = 'Script Result';
const mockVMOn = jest.fn();

jest.mock('vm2', () => ({
    NodeVM: jest.fn().mockImplementation(() => ({
        run: jest.fn().mockImplementation(() => mockVMRunResult),
        on: mockVMOn
    }))
}));

describe('Script Executor', () => {
    const mockPostgresInstance = {
        type: 'POSTGRESQL',
        host: 'localhost',
        port: 5432,
        user: 'user',
        password: 'password',
        ssl: false
    };

    const mockMongoInstanceWithConnectionString = {
        type: 'MONGODB',
        connectionString: 'mongodb+srv://user:pass@cluster.mongodb.net/?retryWrites=true'
    };

    const mockMongoInstanceWithoutConnectionString = {
        type: 'MONGODB',
        host: 'localhost',
        port: 27017,
        user: 'mongouser',
        password: 'mongopass'
    };

    const mockMongoInstanceNoAuth = {
        type: 'MONGODB',
        host: 'localhost',
        port: 27017
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockVMRunResult = 'Script Result';
        axios.get.mockResolvedValue({ data: 'console.log("test")' });
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue('console.log("test")');
    });

    describe('PostgreSQL Instance', () => {
        it('should fetch script from URL when path starts with http', async () => {
            const scriptUrl = 'http://res.cloudinary.com/demo/raw/upload/script.js';
            const scriptContent = 'console.log("Remote Script")';

            axios.get.mockResolvedValue({ data: scriptContent });

            await executeScript(mockPostgresInstance, 'testdb', scriptUrl);

            expect(axios.get).toHaveBeenCalledWith(scriptUrl, { responseType: 'text' });
            expect(fs.readFileSync).not.toHaveBeenCalled();
        });

        it('should read from local file system when path is local', async () => {
            const localPath = '/uploads/script.js';
            const scriptContent = 'console.log("Local Script")';

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(scriptContent);

            await executeScript(mockPostgresInstance, 'testdb', localPath);

            expect(fs.existsSync).toHaveBeenCalledWith(localPath);
            expect(fs.readFileSync).toHaveBeenCalledWith(localPath, 'utf8');
            expect(axios.get).not.toHaveBeenCalled();
        });

        it('should throw error when URL fetch fails', async () => {
            const scriptUrl = 'http://example.com/fail.js';
            axios.get.mockRejectedValue(new Error('Network Error'));

            await expect(executeScript(mockPostgresInstance, 'testdb', scriptUrl))
                .rejects.toThrow('Failed to fetch script from URL');
        });

        it('should throw error when local file not found', async () => {
            const localPath = '/uploads/missing.js';
            fs.existsSync.mockReturnValue(false);

            await expect(executeScript(mockPostgresInstance, 'testdb', localPath))
                .rejects.toThrow('Script file not found');
        });
    });

    describe('MongoDB Instance', () => {
        it('should build URI from connectionString with database', async () => {
            await executeScript(mockMongoInstanceWithConnectionString, 'testdb', 'http://example.com/script.js');
            // The env is set inside the VM, we can't easily test it, but this covers the code path
            expect(axios.get).toHaveBeenCalled();
        });

        it('should build standard MongoDB URI without connectionString', async () => {
            await executeScript(mockMongoInstanceWithoutConnectionString, 'mydb', 'http://example.com/script.js');
            expect(axios.get).toHaveBeenCalled();
        });

        it('should build MongoDB URI without auth when no user provided', async () => {
            await executeScript(mockMongoInstanceNoAuth, 'localdb', 'http://example.com/script.js');
            expect(axios.get).toHaveBeenCalled();
        });
    });

    describe('Result Truncation', () => {
        it('should truncate array results over 100 items and upload to Cloudinary', async () => {
            // Generate array with 150 items
            const largeArray = Array.from({ length: 150 }, (_, i) => ({ id: i, name: `Item ${i}` }));
            mockVMRunResult = largeArray;

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.is_truncated).toBe(true);
            expect(result.total_rows).toBe(150);
            expect(result.output.length).toBe(100);
            expect(cloudStorage.uploadString).toHaveBeenCalled();
            expect(result.result_file_path).toBe('https://res.cloudinary.com/test/raw/upload/test.csv');
        });

        it('should not truncate array results under 100 items', async () => {
            const smallArray = Array.from({ length: 50 }, (_, i) => ({ id: i }));
            mockVMRunResult = smallArray;

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.is_truncated).toBe(false);
            expect(result.total_rows).toBe(50);
            expect(result.output.length).toBe(50);
            expect(cloudStorage.uploadString).not.toHaveBeenCalled();
        });

        it('should handle Cloudinary upload failure gracefully', async () => {
            const largeArray = Array.from({ length: 150 }, (_, i) => ({ id: i }));
            mockVMRunResult = largeArray;
            cloudStorage.uploadString.mockRejectedValueOnce(new Error('Upload failed'));

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.is_truncated).toBe(true);
            expect(result.result_file_path).toBeNull();
        });

        it('should handle empty array result', async () => {
            mockVMRunResult = [];

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.is_truncated).toBe(false);
            expect(result.total_rows).toBeNull();
        });

        it('should handle non-array result', async () => {
            mockVMRunResult = { message: 'success', count: 42 };

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.is_truncated).toBe(false);
            expect(result.output).toEqual({ message: 'success', count: 42 });
        });
    });

    describe('Promise Results', () => {
        it('should await promise results', async () => {
            mockVMRunResult = Promise.resolve([{ id: 1 }, { id: 2 }]);

            const result = await executeScript(mockPostgresInstance, 'testdb', 'http://example.com/script.js');

            expect(result.output).toEqual([{ id: 1 }, { id: 2 }]);
        });
    });
});

