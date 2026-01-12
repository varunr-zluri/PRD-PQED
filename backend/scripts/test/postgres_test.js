// PostgreSQL Test Script
// This script connects to the PostgreSQL database and runs a simple query
// Environment: DB_CONFIG_FILE contains the connection config path

const fs = require('fs');
const { Client } = require('pg');

async function run() {
    const configPath = process.env.DB_CONFIG_FILE;
    if (!configPath) {
        throw new Error('DB_CONFIG_FILE environment variable not set');
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Connecting to PostgreSQL...');
    console.log('Database:', config.database);

    const client = new Client(config);
    await client.connect();
    console.log('Connected successfully!');

    // Run test queries
    console.log('\n--- Running Test Queries ---\n');

    // Query 1: Get all products
    const productsResult = await client.query('SELECT * FROM products LIMIT 5');
    console.log('Products found:', productsResult.rows.length);
    productsResult.rows.forEach(row => {
        console.log(`  - ${row.name}: $${row.price}`);
    });

    // Query 2: Get product count
    const countResult = await client.query('SELECT COUNT(*) as total FROM products');
    console.log('\nTotal products in database:', countResult.rows[0].total);

    await client.end();
    console.log('\nConnection closed. Script completed successfully!');

    return {
        success: true,
        productsCount: parseInt(countResult.rows[0].total),
        sampleProducts: productsResult.rows
    };
}

module.exports = run();
