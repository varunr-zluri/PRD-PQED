const { z } = require('zod');

/**
 * Creates validation middleware for the specified source
 * @param {Object} schema - Zod schema to validate against
 * @param {'body' | 'query' | 'params'} source - Where to get data from request
 */
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);

        if (result.success) {
            req[source] = result.data; // Replace with parsed (and transformed) data
            next();
        } else {
            // Format the Zod errors
            const zodErrors = result.error.errors || result.error.issues || [];
            const errors = zodErrors.map(err => ({
                field: err.path ? err.path.join('.') : 'unknown',
                message: err.message || 'Invalid value'
            }));

            return res.status(400).json({
                error: errors[0]?.message || 'Validation failed',
                errors
            });
        }
    };
};

const validateBody = (schema) => validate(schema, 'body');
const validateQuery = (schema) => validate(schema, 'query');
const validateParams = (schema) => validate(schema, 'params');

module.exports = {
    validate,
    validateBody,
    validateQuery,
    validateParams
};
