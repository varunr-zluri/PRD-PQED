// MongoDB Test Script
// This script connects to the MongoDB database and runs a simple query
// Environment: MONGO_URI contains the connection string

const { MongoClient } = require('mongodb');

async function run() {
    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error('MONGO_URI environment variable not set');
    }

    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri);
    await client.connect();
    console.log('Connected successfully!');

    const db = client.db();
    console.log('Database:', db.databaseName);

    // Run test queries
    console.log('\n--- Running Test Queries ---\n');

    // Query 1: Get all logs
    const logsCollection = db.collection('app_logs');
    const logs = await logsCollection.find({}).limit(5).toArray();
    console.log('Logs found:', logs.length);
    logs.forEach(log => {
        console.log(`  - [${log.level}] ${log.message}`);
    });

    // Query 2: Count ERROR logs
    const errorCount = await logsCollection.countDocuments({ level: 'ERROR' });
    console.log('\nTotal ERROR logs:', errorCount);

    // Query 3: Get unique log levels
    const levels = await logsCollection.distinct('level');
    console.log('Log levels in database:', levels.join(', '));

    await client.close();
    console.log('\nConnection closed. Script completed successfully!');

    return {
        success: true,
        logsCount: logs.length,
        errorCount: errorCount,
        logLevels: levels,
        sampleLogs: logs
    };
}

module.exports = run();
