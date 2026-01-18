const mongoose = require('mongoose');
const { VM } = require('vm2');

const executeMongoQuery = async (instance, databaseName, queryContent) => {
    const match = queryContent.match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/);
    if (!match) {
        throw new Error('Invalid MongoDB query format. Expected: db.collection.method(args)');
    }

    const collectionName = match[1];
    const method = match[2];
    const argsString = match[3];

    const vm = new VM({ sandbox: {} });
    let args = [];
    try {
        args = vm.run(`[${argsString}]`);
    } catch (e) {
        throw new Error('Failed to parse query arguments: ' + e.message);
    }

    // Support both Atlas SRV connection string and standard URI
    let uri;
    if (instance.connectionString) {
        // Use provided connection string (for Atlas SRV)
        uri = instance.connectionString.replace('/?', `/${databaseName}?`);
    } else {
        // Construct standard URI
        const authPart = instance.user ? `${instance.user}:${instance.password}@` : '';
        uri = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}?authSource=admin`;
    }

    let client;
    try {
        const MongoClient = mongoose.mongo.MongoClient;
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000  // 30s timeout for operations
        });
        await client.connect();

        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        if (typeof collection[method] !== 'function') {
            throw new Error(`Method ${method} not supported on collection`);
        }

        let result;
        // Add maxTimeMS to limit query execution time
        if (method === 'find') {
            result = await collection.find(...args).maxTimeMS(30000);
        } else if (method === 'aggregate') {
            result = await collection.aggregate(...args, { maxTimeMS: 30000 });
        } else {
            result = await collection[method](...args);
        }

        if (method === 'find' || method === 'aggregate') {
            return await result.toArray();
        }

        return result;
    } finally {
        if (client) await client.close();
    }
};

module.exports = { executeMongoQuery };
