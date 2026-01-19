const { getEM } = require('../config/database');
const { QueryExecution } = require('../entities/QueryExecution.entity');

const RETENTION_DAYS = 30;

/**
 * Calculate expiry date from created_at
 */
const getExpiryDate = (createdAt) => {
    return new Date(new Date(createdAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
};

/**
 * Check if a path is a URL
 */
const isUrl = (path) => {
    return path && (path.startsWith('http://') || path.startsWith('https://'));
};

/**
 * Download CSV file for a query execution
 * GET /requests/:id/csv
 */
const downloadCSV = async (req, res) => {
    try {
        const em = getEM();
        const requestId = parseInt(req.params.id);

        const execution = await em.findOne(QueryExecution, { request: { id: requestId } });

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found for this request' });
        }

        if (!execution.is_truncated) {
            return res.status(400).json({
                error: 'Result was not truncated. Full data is available in the response.'
            });
        }

        if (!execution.result_file_path) {
            return res.status(404).json({
                message: 'Full results file not available.',
                reason: 'File was never created or has been removed.'
            });
        }

        // Calculate expiry from created_at
        const expiresAt = getExpiryDate(execution.created_at);
        if (new Date() > expiresAt) {
            return res.status(410).json({
                message: 'Results no longer available.',
                reason: 'Files are automatically deleted after 30 days for storage management.',
                expired_at: expiresAt
            });
        }

        // If it's a cloud URL, redirect to it
        if (isUrl(execution.result_file_path)) {
            return res.redirect(execution.result_file_path);
        }

        // Fallback for legacy local files (unlikely in production)
        const fs = require('fs');
        const path = require('path');

        if (!fs.existsSync(execution.result_file_path)) {
            return res.status(410).json({
                message: 'Results file no longer available.',
                reason: 'File has been cleared for storage purposes.'
            });
        }

        const filename = path.basename(execution.result_file_path);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(execution.result_file_path);
        fileStream.pipe(res);
    } catch (error) {
        console.error('[CSV] Error:', error.message);
        res.status(500).json({ error: error.message });
    }
};

/**
 * Get execution details including truncation info
 * GET /requests/:id/execution
 */
const getExecutionDetails = async (req, res) => {
    try {
        const em = getEM();
        const requestId = parseInt(req.params.id);

        const execution = await em.findOne(QueryExecution, { request: { id: requestId } });

        if (!execution) {
            return res.status(404).json({ error: 'Execution not found' });
        }

        // Calculate expiry from created_at
        const expiresAt = execution.is_truncated ? getExpiryDate(execution.created_at) : null;
        let fileAvailable = false;
        let fileExpired = false;

        if (execution.result_file_path) {
            if (expiresAt && new Date() > expiresAt) {
                fileExpired = true;
            } else if (isUrl(execution.result_file_path)) {
                // Cloud URLs are always available (until expired)
                fileAvailable = true;
            } else {
                // Legacy local file check
                const fs = require('fs');
                fileAvailable = fs.existsSync(execution.result_file_path);
            }
        }

        res.json({
            id: execution.id,
            status: execution.status,
            executed_at: execution.executed_at,
            is_truncated: execution.is_truncated,
            total_rows: execution.total_rows,
            result_data: execution.result_data,
            error_message: execution.error_message,
            csv_available: fileAvailable,
            csv_expired: fileExpired,
            expires_at: expiresAt,
            csv_url: isUrl(execution.result_file_path) ? execution.result_file_path : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { downloadCSV, getExecutionDetails };


