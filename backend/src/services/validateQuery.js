/**
 * Query Syntax Validation Service
 * Validates SQL and MongoDB query syntax before submission
 */
const { Parser } = require('node-sql-parser');
const mongoQueryParser = require('mongodb-query-parser');

const sqlParser = new Parser();

/**
 * Validate PostgreSQL query syntax
 * @param {string} query - SQL query to validate
 * @returns {{ valid: boolean, error?: string }}
 */
const validatePostgreSQL = (query) => {
    try {
        // node-sql-parser uses 'PostgresQL' as the database identifier
        sqlParser.astify(query, { database: 'PostgresQL' });
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: `SQL Syntax Error: ${error.message}`
        };
    }
};

/**
 * Validate MongoDB query syntax
 * MongoDB queries can be in several formats:
 * - JSON filter: { "field": "value" }
 * - Shell syntax: db.collection.find({...})
 * - Aggregation: [{ "$match": {...} }]
 * 
 * @param {string} query - MongoDB query string to validate
 * @returns {{ valid: boolean, error?: string }}
 */
const validateMongoDB = (query) => {
    try {
        const trimmed = query.trim();

        // Check for MongoDB shell syntax (db.collection.method(...))
        if (trimmed.startsWith('db.')) {
            // Validate shell syntax using regex
            // Pattern: db.<collection>.<method>(<args>)
            const shellPattern = /^db\.\w+\.\w+\s*\(/;
            if (!shellPattern.test(trimmed)) {
                return {
                    valid: false,
                    error: 'MongoDB Syntax Error: Invalid shell command format. Expected: db.collection.method(...)'
                };
            }

            // Check for balanced parentheses and braces
            let parenCount = 0;
            let braceCount = 0;
            let bracketCount = 0;

            for (const char of trimmed) {
                if (char === '(') parenCount++;
                if (char === ')') parenCount--;
                if (char === '{') braceCount++;
                if (char === '}') braceCount--;
                if (char === '[') bracketCount++;
                if (char === ']') bracketCount--;

                if (parenCount < 0 || braceCount < 0 || bracketCount < 0) {
                    return {
                        valid: false,
                        error: 'MongoDB Syntax Error: Unbalanced brackets or parentheses'
                    };
                }
            }

            if (parenCount !== 0 || braceCount !== 0 || bracketCount !== 0) {
                return {
                    valid: false,
                    error: 'MongoDB Syntax Error: Unclosed brackets or parentheses'
                };
            }

            return { valid: true };
        }

        // For filter/aggregation objects, use parseFilter
        mongoQueryParser.parseFilter(trimmed);
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: `MongoDB Syntax Error: ${error.message}`
        };
    }
};

/**
 * Validate query based on database type
 * @param {string} query - Query string to validate
 * @param {string} dbType - Database type (POSTGRESQL or MONGODB)
 * @returns {{ valid: boolean, error?: string }}
 */
const validateQuery = (query, dbType) => {
    if (!query || !query.trim()) {
        return { valid: false, error: 'Query cannot be empty' };
    }

    switch (dbType) {
        case 'POSTGRESQL':
            return validatePostgreSQL(query);
        case 'MONGODB':
            return validateMongoDB(query);
        default:
            // For unknown database types, skip validation
            return { valid: true };
    }
};

module.exports = {
    validateQuery,
    validatePostgreSQL,
    validateMongoDB
};
