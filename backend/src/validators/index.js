const schemas = require('./schemas');
const { validate, validateBody, validateQuery, validateParams } = require('./validate');

module.exports = {
    ...schemas,
    validate,
    validateBody,
    validateQuery,
    validateParams
};
