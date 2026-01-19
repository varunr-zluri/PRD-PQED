const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Upload scripts to uploads/scripts/ directory
const uploadDir = 'uploads/scripts/';

// Create directory if it doesn't exist
const ensureUploadDir = () => {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
};

// Initialize upload directory
ensureUploadDir();

// Storage destination callback
const destination = (req, file, cb) => {
    cb(null, uploadDir);
};

// Storage filename callback
const filename = (req, file, cb) => {
    // Unique filename: timestamp-random-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
};

const storage = multer.diskStorage({
    destination,
    filename
});

// File filter callback
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/javascript' || file.mimetype === 'application/javascript' || file.originalname.endsWith('.js')) {
        cb(null, true);
    } else {
        cb(new Error('Only JavaScript (.js) files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Export upload as default, plus callbacks for testing
module.exports = upload;
module.exports.destination = destination;
module.exports.filename = filename;
module.exports.fileFilter = fileFilter;
module.exports.ensureUploadDir = ensureUploadDir;
module.exports.uploadDir = uploadDir;
