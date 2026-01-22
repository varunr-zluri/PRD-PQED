const { getEM } = require('../config/database');
const { QueryExecution } = require('../entities/QueryExecution.entity');
const { handleError } = require('../utils/errorHandler');
const axios = require('axios');

const RETENTION_DAYS = 30;

const getExpiryDate = (createdAt) => {
    return new Date(new Date(createdAt).getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
};

/**
 * Verify cloud URL is accessible
 */
const verifyCloudUrl = async (url) => {
    try {
        const response = await axios.head(url, { timeout: 5000 });
        return response.status >= 200 && response.status < 300;
    } catch (error) {
        return false;
    }
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

        // Verify cloud URL exists before redirecting
        const isAvailable = await verifyCloudUrl(execution.result_file_path);
        if (!isAvailable) {
            return res.status(410).json({
                message: 'File is no longer available.',
                reason: 'The file may have been deleted from cloud storage.'
            });
        }
        return res.redirect(execution.result_file_path);
    } catch (error) {
        console.error('[CSV] Error:', error.message);
        return handleError(error, res);
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
            } else {
                // Cloud file - available until expired
                fileAvailable = true;
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
            csv_url: execution.result_file_path || null
        });
    } catch (error) {
        return handleError(error, res);
    }
};

module.exports = { downloadCSV, getExecutionDetails };


