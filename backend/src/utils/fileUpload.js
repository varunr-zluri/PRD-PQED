const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Cloudinary Storage
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'zluri-sre/scripts', // Cloudinary folder
        resource_type: 'raw',        // IMPORTANT: 'raw' for non-image files like .js
        public_id: (req, file) => {
            // Unique filename: timestamp-random-originalName
            // Note: Cloudinary 'raw' resources keep their extension automatically if part of public_id
            const name = path.parse(file.originalname).name;
            return `${Date.now()}-${Math.round(Math.random() * 1E9)}-${name}`;
        }
    }
});

// File filter callback
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'text/javascript' ||
        file.mimetype === 'application/javascript' ||
        file.originalname.endsWith('.js')) {
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

module.exports = upload;
module.exports.fileFilter = fileFilter;
module.exports.storage = storage;

