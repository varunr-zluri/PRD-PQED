const { DatabaseInstance } = require('../models');
const { executePostgresQuery } = require('./postgresExecutor');
const { executeMongoQuery } = require('./mongoExecutor');
const { executeScript } = require('./scriptExecutor');

const executeRequest = async (request) => {
    console.log(`[ExecutionService] Starting execution for request ${request.id}`);

    try {
        // Fetch instance details to get host/port/creds
        const instance = await DatabaseInstance.findOne({
            where: { name: request.instance_name, type: request.db_type }
        });

        if (!instance) {
            throw new Error(`Database instance ${request.instance_name} (${request.db_type}) not found`);
        }

        let result;

        if (request.submission_type === 'SCRIPT') {
            result = await executeScript(instance, request.database_name, request.script_path);
        } else {
            // QUERY
            if (request.db_type === 'POSTGRESQL') {
                result = await executePostgresQuery(instance, request.database_name, request.query_content);
            } else if (request.db_type === 'MONGODB') {
                result = await executeMongoQuery(instance, request.database_name, request.query_content);
            } else {
                throw new Error('Unsupported database type');
            }
        }

        return { success: true, result };
    } catch (error) {
        console.error(`[ExecutionService] Error executing request ${request.id}:`, error);
        return { success: false, error: error.message };
    }
};

module.exports = {
    executeRequest
};
