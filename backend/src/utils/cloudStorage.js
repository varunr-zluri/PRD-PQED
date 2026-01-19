/**
 * Cloud Storage Utility
 * Helper for uploading content to Cloudinary
 */

const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

// Configure Cloudinary (uses env vars set in fileUpload.js or here)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload a string (e.g., CSV content) to Cloudinary as a raw file
 * @param {string} content - The string content to upload
 * @param {string} filename - Suggested filename (without extension)
 * @param {string} folder - Cloudinary folder path
 * @returns {Promise<string>} - The secure URL of the uploaded file
 */
const uploadString = async (content, filename, folder = 'zluri-sre/results') => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'raw',
                folder: folder,
                public_id: filename,
                format: 'csv'
            },
            (error, result) => {
                if (error) {
                    console.error('[CloudStorage] Upload error:', error.message);
                    reject(error);
                } else {
                    console.log(`[CloudStorage] Uploaded ${filename} to ${result.secure_url}`);
                    resolve(result.secure_url);
                }
            }
        );

        // Convert string to stream and pipe to upload
        const readable = Readable.from([content]);
        readable.pipe(uploadStream);
    });
};

module.exports = {
    uploadString,
    cloudinary
};
