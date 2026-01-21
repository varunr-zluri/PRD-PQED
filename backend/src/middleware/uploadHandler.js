const multer = require('multer');
const upload = require('../utils/fileUpload');

/**
 * Middleware wrapper for multer single file upload with graceful error handling.
 * Handles multer-specific errors and returns proper 400 responses.
 */
const handleScriptUpload = (req, res, next) => {
    upload.single('script_file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer-specific errors
            if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                return res.status(400).json({ error: 'Only one script file can be uploaded at a time' });
            }
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'File size exceeds the 5MB limit' });
            }
            return res.status(400).json({ error: `Upload error: ${err.message}` });
        } else if (err) {
            // Custom file filter errors or other errors
            return res.status(400).json({ error: err.message });
        }
        next();
    });
};

module.exports = { handleScriptUpload };
