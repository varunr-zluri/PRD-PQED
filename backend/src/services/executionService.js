const { databases } = require('../config/databases');
const { executePostgresQuery } = require('./postgresExecutor');
const { executeMongoQuery } = require('./mongoExecutor');
const { executeScript } = require('./scriptExecutor');

const executeRequest = async (request) => {
    try {
        const instance = databases.find(db => db.name === request.instance_name && db.type === request.db_type);

        if (!instance) {
            throw new Error(`Database instance ${request.instance_name} (${request.db_type}) not found in configuration`);
        }

        let result;

        if (request.submission_type === 'SCRIPT') {
            result = await executeScript(instance, request.database_name, request.script_path);
        } else if (request.db_type === 'POSTGRESQL') {
            result = await executePostgresQuery(instance, request.database_name, request.query_content);
        } else if (request.db_type === 'MONGODB') {
            result = await executeMongoQuery(instance, request.database_name, request.query_content);
        } else {
            throw new Error('Unsupported database type');
        }

        return { success: true, result };
    } catch (error) {
        console.error(`[ExecutionService] Error:`, error.message);
        return { success: false, error: error.message };
    }
};

module.exports = { executeRequest };
