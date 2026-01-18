const { databases } = require('../config/databases');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

const getResources = async (req, res) => {
    try {
        const { instance } = req.query;

        if (instance) {
            const dbInstance = databases.find(db => db.name === instance);

            if (!dbInstance) {
                return res.status(404).json({ error: 'Database instance not found' });
            }

            let dbList = [];

            if (dbInstance.type === 'POSTGRESQL') {
                const client = new Client({
                    user: dbInstance.user,
                    host: dbInstance.host,
                    database: 'postgres',
                    password: dbInstance.password,
                    port: dbInstance.port,
                    // SSL required for Supabase
                    ssl: dbInstance.ssl !== undefined ? dbInstance.ssl : { rejectUnauthorized: false }
                });
                await client.connect();
                const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
                dbList = result.rows.map(row => row.datname);
                await client.end();
            } else if (dbInstance.type === 'MONGODB') {
                // Support both Atlas SRV connection string and standard URI
                let url;
                if (dbInstance.connectionString) {
                    url = dbInstance.connectionString;
                } else {
                    url = `mongodb://${dbInstance.user}:${dbInstance.password}@${dbInstance.host}:${dbInstance.port}/?authSource=admin`;
                }
                const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
                await client.connect();
                const result = await client.db('admin').admin().listDatabases();
                // Filter out system databases
                dbList = result.databases
                    .map(db => db.name)
                    .filter(name => !['admin', 'local', 'config'].includes(name));
                await client.close();
            }

            return res.json({ databases: dbList });
        }

        // Return clean instances list (no credentials)
        const instances = databases.map(db => ({
            name: db.name,
            type: db.type
        }));
        res.json(instances);
    } catch (error) {
        console.error('[DatabaseController] Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch resources', details: error.message });
    }
};

module.exports = { getResources };

