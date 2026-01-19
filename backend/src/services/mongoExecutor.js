const mongoose = require('mongoose');
const { VM } = require('vm2');
const { v4: uuidv4 } = require('uuid');
const { uploadString } = require('../utils/cloudStorage');

const MAX_ROWS = 100;

/**
 * Convert array of objects to CSV string
 */
const arrayToCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    for (const row of data) {
        const values = headers.map(h => {
            const val = row[h];
            const str = val === null || val === undefined ? '' : String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const executeMongoQuery = async (instance, databaseName, queryContent) => {
    const match = queryContent.match(/^db\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\((.*)\)$/);
    if (!match) {
        throw new Error('Invalid MongoDB query format. Expected: db.collection.method(args)');
    }

    const collectionName = match[1];
    const method = match[2];
    const argsString = match[3] || '';

    const vm = new VM({ sandbox: {} });
    let args = [];
    try {
        if (argsString.trim()) {
            args = vm.run(`[${argsString}]`);
        }
    } catch (e) {
        throw new Error('Failed to parse query arguments: ' + e.message);
    }

    // Support both Atlas SRV connection string and standard URI
    let uri;
    if (instance.connectionString) {
        uri = instance.connectionString.replace('/?', `/${databaseName}?`);
    } else {
        const authPart = instance.user ? `${instance.user}:${instance.password}@` : '';
        uri = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}?authSource=admin`;
    }

    let client;
    try {
        const MongoClient = mongoose.mongo.MongoClient;
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000
        });
        await client.connect();

        const db = client.db(databaseName);
        const collection = db.collection(collectionName);

        if (typeof collection[method] !== 'function') {
            throw new Error(`Method ${method} not supported on collection`);
        }

        let allRows;
        if (method === 'find') {
            allRows = await collection.find(...args).maxTimeMS(30000).toArray();
        } else if (method === 'aggregate') {
            allRows = await collection.aggregate(...args, { maxTimeMS: 30000 }).toArray();
        } else {
            const result = await collection[method](...args);
            // Non-array results (insert, update, delete) don't need truncation
            return {
                rows: result,
                is_truncated: false,
                total_rows: result?.modifiedCount || result?.insertedCount || result?.deletedCount || 1,
                result_file_path: null,
                result_expires_at: null
            };
        }

        const totalRows = allRows.length;
        const isTruncated = totalRows > MAX_ROWS;

        const response = {
            rows: isTruncated ? allRows.slice(0, MAX_ROWS) : allRows,
            is_truncated: isTruncated,
            total_rows: totalRows,
            result_file_path: null
        };

        // If truncated, upload full result to Cloudinary
        if (isTruncated) {
            const filename = `mongo_${uuidv4()}`;
            const csvContent = arrayToCSV(allRows);
            const cloudUrl = await uploadString(csvContent, filename);
            response.result_file_path = cloudUrl;
            console.log(`[MongoExecutor] Uploaded ${totalRows} rows to Cloudinary`);
        }

        return response;
    } finally {
        if (client) await client.close();
    }
};

module.exports = { executeMongoQuery };


