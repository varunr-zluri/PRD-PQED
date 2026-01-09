const { databases } = require('../config/databases');
const { Client } = require('pg');
const { MongoClient } = require('mongodb');

const getInstances = (req, res) => {
    // Return instances without sensitive data
    const instances = databases.map(db => ({
        name: db.name,
        type: db.type,
        host: db.host,
        port: db.port
    }));
    res.json(instances);
};

const getInstance = (req, res) => {
    const instance = databases.find(db => db.name === req.params.id);
    if (!instance) {
        return res.status(404).json({ error: 'Instance not found' });
    }
    // Remove sensitive data
    const safeInstance = { ...instance };
    delete safeInstance.password;
    delete safeInstance.user; // Optional: maybe we want to show user
    res.json(safeInstance);
};

const getDatabases = async (req, res) => {
    const instanceName = req.params.id;
    const instance = databases.find(db => db.name === instanceName);

    if (!instance) {
        return res.status(404).json({ error: 'Database instance not found' });
    }

    try {
        let dbList = [];

        if (instance.type === 'POSTGRESQL') {
            const client = new Client({
                user: instance.user,
                host: instance.host,
                database: instance.database, // Connect to default DB
                password: instance.password,
                port: instance.port,
            });
            await client.connect();
            const result = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
            dbList = result.rows.map(row => row.datname);
            await client.end();

        } else if (instance.type === 'MONGODB') {
            // MongoDB Connection String
            const url = `mongodb://${instance.user}:${instance.password}@${instance.host}:${instance.port}`;
            const client = new MongoClient(url);
            await client.connect();
            const adminDb = client.db('admin');
            const result = await adminDb.admin().listDatabases();
            dbList = result.databases.map(db => db.name);
            await client.close();
        }

        res.json({ databases: dbList });
    } catch (error) {
        console.error('Error fetching databases:', error);
        res.status(500).json({ error: 'Failed to fetch databases', details: error.message });
    }
};

module.exports = {
    getInstances,
    getInstance,
    getDatabases
};
