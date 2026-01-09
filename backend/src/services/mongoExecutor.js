// const { MongoClient } = require('mongodb'); 
// Using require('mongoose').mongo to get the driver if available, or just use mongoose
const mongoose = require('mongoose');
const { decrypt } = require('../utils/crypto');

const executeMongoQuery = async (instance, databaseName, queryContent) => {
    // queryContent is expected to be something like: db.collection('users').find({})
    // But strictly parsing that string is hard. 
    // SRS says: "Execute MongoDB query/command".
    // Doing `eval` on Mongo server is dangerous and often disabled.
    // A better approach for the portal:
    // Expect query to be a JSON object like { "collection": "users", "action": "find", "filter": {} }
    // OR
    // If we must support shell-like syntax, we need a parser.
    //
    // Given FR5.2: "Execute MongoDB query/command". 
    // And Example in Appendix: `db.users.deleteMany({ status: 'duplicate' })`
    // This implies we need to interpret the string.
    //
    // For MVP, we can try to interpret simple commands OR use a sandboxed JS execution 
    // that has a mock 'db' object and calls actual mongo driver.
    //
    // Let's reuse the script executor approach but specific for Mongo OR
    // use a simplified parser for common commands (find, findOne, insert, update, remove).
    //
    // Let's try to parse: "db.<collection>.<method>(<args>)"

    const match = queryContent.match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/);
    if (!match) {
        throw new Error('Invalid MongoDB query format. Expected: db.collection.method(args)');
    }

    const collectionName = match[1];
    const method = match[2];
    const argsString = match[3];

    // Parse arguments. This is tricky safely.
    // We can use vm2 to evaluate the args string to get the object.
    const { VM } = require('vm2');
    const vm = new VM({ sandbox: {} });
    let args = [];
    try {
        // If argsString represents multiple arguments (e.g. update(filter, update)), 
        // we wrap in array to parse: "[" + args + "]" 
        // But wait, args are comma separated.
        args = vm.run(`[${argsString}]`);
    } catch (e) {
        throw new Error('Failed to parse query arguments: ' + e.message);
    }

    const credentials = decrypt(instance.credentials_encrypted);
    const authPart = credentials.username ? `${credentials.username}:${credentials.password}@` : '';
    const uri = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}`;

    let client;
    try {
        // We use the native driver from mongoose
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
