const { Client } = require('pg');

const executePostgresQuery = async (instance, databaseName, query) => {
    const client = new Client({
        host: instance.host,
        port: instance.port,
        database: databaseName,
        user: instance.user,
        password: instance.password,
        // Use instance.ssl if defined, otherwise enable SSL with rejectUnauthorized:false for cloud DBs
        ssl: instance.ssl !== undefined ? instance.ssl : { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Set a timeout for the query (e.g., 30s)
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
