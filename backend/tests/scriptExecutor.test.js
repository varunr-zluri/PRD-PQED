/**
 * Script Executor Tests
 * Tests for URL fetching vs Local file reading
 */

const { executeScript } = require('../src/services/scriptExecutor');
const axios = require('axios');
const fs = require('fs');

jest.mock('axios');
jest.mock('fs');
jest.mock('vm2', () => ({
    NodeVM: jest.fn().mockImplementation(() => ({
        run: jest.fn().mockReturnValue('Script Result'),
        on: jest.fn()
    }))
}));
jest.mock('../src/utils/cloudStorage', () => ({
    uploadString: jest.fn().mockResolvedValue('https://res.cloudinary.com/test/raw/upload/test.csv')
}));

describe('Script Executor', () => {
    const mockInstance = {
        type: 'POSTGRESQL',
        host: 'localhost',
        port: 5432,
        user: 'user',
        password: 'password',
        ssl: false
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch script from URL when path starts with http', async () => {
        const scriptUrl = 'http://res.cloudinary.com/demo/raw/upload/script.js';
        const scriptContent = 'console.log("Remote Script")';

        // Mock axios response
        axios.get.mockResolvedValue({ data: scriptContent });

        await executeScript(mockInstance, 'testdb', scriptUrl);

        expect(axios.get).toHaveBeenCalledWith(scriptUrl, { responseType: 'text' });
        expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it('should read from local file system when path is local', async () => {
        const localPath = '/uploads/script.js';
        const scriptContent = 'console.log("Local Script")';

        // Mock fs existence and read
        fs.existsSync.mockReturnValue(true);
        fs.readFileSync.mockReturnValue(scriptContent);

        await executeScript(mockInstance, 'testdb', localPath);

        expect(fs.existsSync).toHaveBeenCalledWith(localPath);
        expect(fs.readFileSync).toHaveBeenCalledWith(localPath, 'utf8');
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('should throw error when URL fetch fails', async () => {
        const scriptUrl = 'http://example.com/fail.js';
        axios.get.mockRejectedValue(new Error('Network Error'));

        await expect(executeScript(mockInstance, 'testdb', scriptUrl))
            .rejects.toThrow('Failed to fetch script from URL');
    });

    it('should throw error when local file not found', async () => {
        const localPath = '/uploads/missing.js';
        fs.existsSync.mockReturnValue(false);

        await expect(executeScript(mockInstance, 'testdb', localPath))
            .rejects.toThrow('Script file not found');
    });
});
