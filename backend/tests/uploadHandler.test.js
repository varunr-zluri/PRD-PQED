/**
 * Upload Handler Middleware Tests
 * Tests for multer error handling branches
 */
const multer = require('multer');

// Mock the fileUpload module
const mockSingle = jest.fn();
jest.mock('../src/utils/fileUpload', () => ({
    single: mockSingle
}));

const { handleScriptUpload } = require('../src/middleware/uploadHandler');

describe('uploadHandler middleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {};
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        mockNext = jest.fn();
    });

    it('should call next() when no error occurs', () => {
        mockSingle.mockReturnValue((req, res, callback) => {
            callback(null); // No error
        });

        handleScriptUpload(mockReq, mockRes, mockNext);

        expect(mockNext).toHaveBeenCalled();
        expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_UNEXPECTED_FILE multer error', () => {
        const multerError = new multer.MulterError('LIMIT_UNEXPECTED_FILE');
        mockSingle.mockReturnValue((req, res, callback) => {
            callback(multerError);
        });

        handleScriptUpload(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Only one script file can be uploaded at a time'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle LIMIT_FILE_SIZE multer error', () => {
        const multerError = new multer.MulterError('LIMIT_FILE_SIZE');
        mockSingle.mockReturnValue((req, res, callback) => {
            callback(multerError);
        });

        handleScriptUpload(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'File size exceeds the 5MB limit'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle other multer errors', () => {
        const multerError = new multer.MulterError('LIMIT_FIELD_COUNT');
        multerError.message = 'Too many fields';
        mockSingle.mockReturnValue((req, res, callback) => {
            callback(multerError);
        });

        handleScriptUpload(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Upload error: Too many fields'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle custom file filter errors', () => {
        const customError = new Error('Only JavaScript files are allowed');
        mockSingle.mockReturnValue((req, res, callback) => {
            callback(customError);
        });

        handleScriptUpload(mockReq, mockRes, mockNext);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
            error: 'Only JavaScript files are allowed'
        });
        expect(mockNext).not.toHaveBeenCalled();
    });
});
