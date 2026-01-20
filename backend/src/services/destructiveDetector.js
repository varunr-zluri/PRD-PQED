/**
 * Destructive Query Detection Service
 * Detects potentially dangerous operations in SQL and MongoDB queries
 */

// PostgreSQL destructive keywords
const PG_DESTRUCTIVE_PATTERNS = [
    /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX|VIEW|FUNCTION|TRIGGER)/i,
    /\bTRUNCATE\s+/i,
    /\bDELETE\s+FROM\s+/i,
    /\bALTER\s+(TABLE|DATABASE)/i,
    /\bUPDATE\s+.*\bSET\s+/i,
    /\bINSERT\s+INTO\s+/i,
    /\bCREATE\s+OR\s+REPLACE\s+/i,
];

// MongoDB destructive methods
const MONGO_DESTRUCTIVE_PATTERNS = [
    /\.drop\s*\(/i,
    /\.deleteOne\s*\(/i,
    /\.deleteMany\s*\(/i,
    /\.remove\s*\(/i,
    /\.updateOne\s*\(/i,
    /\.updateMany\s*\(/i,
    /\.replaceOne\s*\(/i,
    /\.insertOne\s*\(/i,
    /\.insertMany\s*\(/i,
    /\.findOneAndDelete\s*\(/i,
    /\.findOneAndUpdate\s*\(/i,
    /\.findOneAndReplace\s*\(/i,
    /\$set\b/i,
    /\$unset\b/i,
    /\$push\b/i,
    /\$pull\b/i,
];

// Script destructive patterns
const SCRIPT_DESTRUCTIVE_PATTERNS = [
    /\.drop\s*\(/i,
    /\.delete/i,
    /\.remove\s*\(/i,
    /\.update/i,
    /\.insert/i,
    /DROP\s+/i,
    /DELETE\s+/i,
    /TRUNCATE\s+/i,
    /UPDATE\s+.*SET/i,
];

/**
 * Check if a query contains destructive operations
 * @param {string} content - Query content or script content
 * @param {string} dbType - POSTGRESQL or MONGODB
 * @param {string} submissionType - QUERY or SCRIPT
 * @returns {{ isDestructive: boolean, warnings: string[] }}
 */
const detectDestructiveOperations = (content, dbType, submissionType) => {
    if (!content) {
        return { isDestructive: false, warnings: [] };
    }

    const warnings = [];

    if (submissionType === 'SCRIPT') {
        // Check script content
        for (const pattern of SCRIPT_DESTRUCTIVE_PATTERNS) {
            if (pattern.test(content)) {
                warnings.push(`Script contains potentially destructive operation: ${pattern.source.replace(/\\s\+|\\/gi, ' ').substring(0, 30)}...`);
            }
        }
    } else if (dbType === 'POSTGRESQL') {
        for (const pattern of PG_DESTRUCTIVE_PATTERNS) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                warnings.push(`Query contains: ${match ? match[0].toUpperCase() : 'destructive operation'}`);
            }
        }
    } else if (dbType === 'MONGODB') {
        for (const pattern of MONGO_DESTRUCTIVE_PATTERNS) {
            if (pattern.test(content)) {
                const match = content.match(pattern);
                warnings.push(`Query contains: ${match ? match[0] : 'destructive operation'}`);
            }
        }
    }

    // Remove duplicates and limit to 5 warnings
    const uniqueWarnings = [...new Set(warnings)].slice(0, 5);

    return {
        isDestructive: uniqueWarnings.length > 0,
        warnings: uniqueWarnings
    };
};

module.exports = { detectDestructiveOperations };
