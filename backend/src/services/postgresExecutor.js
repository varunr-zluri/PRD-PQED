const { Client } = require('pg');
const { decrypt } = require('../utils/crypto');

const executePostgresQuery = async (instance, databaseName, query) => {
    const credentials = decrypt(instance.credentials_encrypted);

    const client = new Client({
        host: instance.host,
        port: instance.port,
        database: databaseName,
        user: credentials.username || 'postgres', // Fallback for testing
        password: credentials.password || 'postgres',
        ssl: false // In prod, might need SSL
    });

    try {
        await client.connect();

        // Set a timeout for the query (e.g., 30s)
        // We can do this by setting statement_timeout in the session or using the query config
        await client.query('SET statement_timeout = 30000');

        const result = await client.query(query);
        return result.rows;
    } finally {
        await client.end();
    }
};

module.exports = {
    executePostgresQuery
};
