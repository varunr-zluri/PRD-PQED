/**
 * File Upload Utility Tests
 * Tests for multer storage callbacks and file filter
 */

const path = require('path');
const fs = require('fs');

// Import the callbacks directly
const upload = require('../src/utils/fileUpload');
const { destination, filename, fileFilter, ensureUploadDir, uploadDir } = upload;

describe('File Upload Utility', () => {
    describe('destination callback', () => {
        it('should set destination to uploads/scripts/', (done) => {
            const mockReq = {};
            const mockFile = { originalname: 'test.js' };

            destination(mockReq, mockFile, (err, dest) => {
                expect(err).toBeNull();
                expect(dest).toBe(uploadDir);
                done();
            });
        });
    });

    describe('filename callback', () => {
        it('should generate unique filename with timestamp and extension', (done) => {
            const mockReq = {};
            const mockFile = { originalname: 'script.js' };

            filename(mockReq, mockFile, (err, generatedName) => {
                expect(err).toBeNull();
                expect(generatedName).toMatch(/^\d+-\d+\.js$/);
                done();
            });
        });

        it('should preserve original file extension', (done) => {
            const mockReq = {};
            const mockFile = { originalname: 'my-script.js' };

            filename(mockReq, mockFile, (err, generatedName) => {
                expect(err).toBeNull();
                expect(generatedName.endsWith('.js')).toBe(true);
                done();
            });
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

        it('should reject Python files', (done) => {
            const mockReq = {};
            const mockFile = { mimetype: 'text/x-python', originalname: 'script.py' };

            fileFilter(mockReq, mockFile, (err, accept) => {
                expect(err).toBeInstanceOf(Error);
                expect(accept).toBe(false);
                done();
            });
        });
    });

    describe('ensureUploadDir', () => {
        it('should be a function', () => {
            expect(typeof ensureUploadDir).toBe('function');
        });

        it('should not throw when called multiple times', () => {
            expect(() => {
                ensureUploadDir();
                ensureUploadDir();
            }).not.toThrow();
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
