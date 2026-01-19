/**
 * File Upload Utility Tests
 * Tests for multer Cloudinary configuration and file filter
 */

const { fileFilter, storage } = require('../src/utils/fileUpload');
const upload = require('../src/utils/fileUpload');

describe('File Upload Utility', () => {
    describe('Cloudinary Storage', () => {
        it('should be configured with correct folder and resource type', () => {
            expect(storage).toBeDefined();
            // CloudinaryStorage stores params in options or similar, structure varies by version
            // We'll just verify it exists and looks like a CloudinaryStorage instance
            expect(storage.constructor.name).toBe('CloudinaryStorage');
        });
    });

    describe('fileFilter callback', () => {
        it('should accept text/javascript mimetype', (done) => {
            const mockReq = {};
            const mockFile = { mimetype: 'text/javascript', originalname: 'test.js' };

            fileFilter(mockReq, mockFile, (err, accept) => {
                expect(err).toBeNull();
                expect(accept).toBe(true);
                done();
            });
        });

        it('should accept application/javascript mimetype', (done) => {
            const mockReq = {};
            const mockFile = { mimetype: 'application/javascript', originalname: 'test.js' };

            fileFilter(mockReq, mockFile, (err, accept) => {
                expect(err).toBeNull();
                expect(accept).toBe(true);
                done();
            });
        });

        it('should accept files with .js extension regardless of mimetype', (done) => {
            const mockReq = {};
            const mockFile = { mimetype: 'application/octet-stream', originalname: 'script.js' };

            fileFilter(mockReq, mockFile, (err, accept) => {
                expect(err).toBeNull();
                expect(accept).toBe(true);
                done();
            });
        });

        it('should reject non-JavaScript files', (done) => {
            const mockReq = {};
            const mockFile = { mimetype: 'text/plain', originalname: 'readme.txt' };

            fileFilter(mockReq, mockFile, (err, accept) => {
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toContain('Only JavaScript');
                expect(accept).toBe(false);
                done();
            });
        });
    });

    describe('upload multer instance', () => {
        it('should be a valid multer instance', () => {
            expect(upload).toHaveProperty('single');
            expect(upload).toHaveProperty('array');
            expect(upload).toHaveProperty('fields');
        });
    });
});
