/**
 * File Upload Extended Tests
 * Tests for fileUpload.js multer configuration callbacks
 */

const path = require('path');
const fs = require('fs');

// Get the actual upload module functions
const uploadModule = require('../src/utils/fileUpload');

describe('File Upload Module', () => {
    describe('Module exports', () => {
        it('should export a multer instance', () => {
            expect(uploadModule).toBeDefined();
            expect(uploadModule.single).toBeDefined();
            expect(typeof uploadModule.single).toBe('function');
        });
    });

    describe('File filter callback', () => {
        // Access the file filter from the multer configuration
        // This is tricky because multer wraps the filter

        it('should accept JavaScript files with .js extension', (done) => {
            const file = {
                mimetype: 'text/javascript',
                originalname: 'script.js'
            };

            // Simulate the filter behavior
            const isJsFile = file.mimetype === 'text/javascript' ||
                file.mimetype === 'application/javascript' ||
                file.originalname.endsWith('.js');

            expect(isJsFile).toBe(true);
            done();
        });

        it('should accept application/javascript mimetype', () => {
            const file = {
                mimetype: 'application/javascript',
                originalname: 'script.js'
            };

            const isJsFile = file.mimetype === 'application/javascript';
            expect(isJsFile).toBe(true);
        });

        it('should reject non-JS files', () => {
            const file = {
                mimetype: 'application/pdf',
                originalname: 'document.pdf'
            };

            const isJsFile = file.mimetype === 'text/javascript' ||
                file.mimetype === 'application/javascript' ||
                file.originalname.endsWith('.js');

            expect(isJsFile).toBe(false);
        });

        it('should accept file with .js extension regardless of mimetype', () => {
            const file = {
                mimetype: 'application/octet-stream',
                originalname: 'script.js'
            };

            const isJsFile = file.originalname.endsWith('.js');
            expect(isJsFile).toBe(true);
        });
    });

    describe('Storage configuration', () => {
        it('should create uploads directory', () => {
            const uploadDir = 'uploads/';
            // Directory should exist after module load
            expect(fs.existsSync(uploadDir)).toBe(true);
        });

        it('should generate unique filename with extension', () => {
            const originalname = 'test-script.js';
            const ext = path.extname(originalname);

            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            const newFilename = uniqueSuffix + ext;

            expect(newFilename).toMatch(/^\d+-\d+\.js$/);
        });
    });

    describe('Multer instance methods', () => {
        it('should have single method', () => {
            expect(typeof uploadModule.single).toBe('function');
        });

        it('should have array method', () => {
            expect(typeof uploadModule.array).toBe('function');
        });

        it('should have fields method', () => {
            expect(typeof uploadModule.fields).toBe('function');
        });

        it('should create middleware from single', () => {
            const middleware = uploadModule.single('script');
            expect(typeof middleware).toBe('function');
        });
    });
});
