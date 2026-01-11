const mongoose = require('mongoose');

const executeMongoQuery = async (instance, databaseName, queryContent) => {
    // queryContent is expected to be something like: db.collection('users').find({})
    // Parse: "db.<collection>.<method>(<args>)"

    const match = queryContent.match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/);
    if (!match) {
        throw new Error('Invalid MongoDB query format. Expected: db.collection.method(args)');
    }

    const collectionName = match[1];
    const method = match[2];
    const argsString = match[3];

    // Parse arguments using vm2 for safety
    const { VM } = require('vm2');
    const vm = new VM({ sandbox: {} });
    let args = [];
    try {
        args = vm.run(`[${argsString}]`);
    } catch (e) {
        throw new Error('Failed to parse query arguments: ' + e.message);
    }

    // Build connection URI using plain credentials from config
    const authPart = instance.user ? `${instance.user}:${instance.password}@` : '';
    const uri = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}?authSource=admin`;

    let client;
    try {
        const MongoClient = mongoose.mongo.MongoClient;
        client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
        await client.connect();

        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        if (typeof collection[method] !== 'function') {
            throw new Error(`Method ${method} not supported on collection`);
        }

        const result = await collection[method](...args);

        // For cursors (find), we need to toArray()
        if (method === 'find' || method === 'aggregate') {
            return await result.toArray();
        }

        return result;
    } finally {
        if (client) await client.close();
    }
};

module.exports = {
    executeMongoQuery
};
