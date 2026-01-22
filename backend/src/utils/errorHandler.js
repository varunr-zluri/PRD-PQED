/**
 * Centralized Error Handler Utility
 * Maps error types to appropriate HTTP status codes
 */

/**
 * Determines the appropriate HTTP status code based on error type
 * @param {Error} error - The caught error
 * @returns {number} HTTP status code
 */
const getErrorStatusCode = (error) => {
    const message = error.message?.toLowerCase() || '';
    const code = error.code;

    // Connection/Network errors → 503 Service Unavailable
    if (
        message.includes('connection') ||
        message.includes('econnrefused') ||
        message.includes('timeout') ||
        message.includes('network') ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT'
    ) {
        return 503;
    }

    // Authentication/Authorization errors → 401/403
    if (
        message.includes('unauthorized') ||
        message.includes('authentication') ||
        code === 'INVALID_TOKEN'
    ) {
        return 401;
    }

    if (
        message.includes('forbidden') ||
        message.includes('access denied') ||
        message.includes('permission')
    ) {
        return 403;
    }

    // Not found errors → 404
    if (
        message.includes('not found') ||
        message.includes('does not exist') ||
        code === 'NOT_FOUND'
    ) {
        return 404;
    }

    // Validation/Bad request errors → 400
    if (
        message.includes('invalid') ||
        message.includes('required') ||
        message.includes('must be') ||
        message.includes('cannot be') ||
        message.includes('validation') ||
        message.includes('syntax') ||
        message.includes('parse')
    ) {
        return 400;
    }

    // Database constraint errors → 409 Conflict
    if (
        message.includes('duplicate') ||
        message.includes('already exists') ||
        message.includes('unique constraint') ||
        code === 'ER_DUP_ENTRY' ||
        code === '23505' // PostgreSQL unique violation
    ) {
        return 409;
    }

    // Resource exhausted → 429 Too Many Requests
    if (
        message.includes('rate limit') ||
        message.includes('too many') ||
        code === 'RATE_LIMITED'
    ) {
        return 429;
    }

    // Unprocessable entity → 422
    if (
        message.includes('unprocessable') ||
        message.includes('cannot process')
    ) {
        return 422;
    }

    // Default to 400 Bad Request instead of 500
    // This keeps 500 as truly unexpected server errors only
    return 400;
};

/**
 * Formats error response object
 * @param {Error} error - The caught error
 * @returns {object} Formatted error response
 */
const formatErrorResponse = (error) => {
    return {
        error: error.message || 'An unexpected error occurred',
        code: error.code || undefined
    };
};

/**
 * Express error handler middleware helper
 * @param {Error} error - The caught error
 * @param {Response} res - Express response object
 */
const handleError = (error, res) => {
    const statusCode = getErrorStatusCode(error);
    const response = formatErrorResponse(error);

    console.error(`[ErrorHandler] ${statusCode}: ${error.message}`);

    return res.status(statusCode).json(response);
};

module.exports = {
    getErrorStatusCode,
    formatErrorResponse,
    handleError
};
