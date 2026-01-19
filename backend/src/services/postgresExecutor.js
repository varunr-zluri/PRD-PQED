const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const MAX_ROWS = 100;
const RESULTS_DIR = path.join(__dirname, '../../uploads/results');
const RETENTION_DAYS = 30;

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

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
            // Escape quotes and wrap in quotes if contains comma
            const str = val === null ? '' : String(val);
            return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
        });
        csvRows.push(values.join(','));
    }
    return csvRows.join('\n');
};

const executePostgresQuery = async (instance, databaseName, query) => {
    const client = new Client({
        host: instance.host,
        port: instance.port,
        database: databaseName,
        user: instance.user,
        password: instance.password,
        ssl: instance.ssl !== undefined ? instance.ssl : { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query('SET statement_timeout = 30000');

        const result = await client.query(query);
        const allRows = result.rows;
        const totalRows = allRows.length;
        const isTruncated = totalRows > MAX_ROWS;

        // Prepare response
        const response = {
            rows: isTruncated ? allRows.slice(0, MAX_ROWS) : allRows,
            is_truncated: isTruncated,
            total_rows: totalRows,
            result_file_path: null
        };

        // If truncated, save full result as CSV
        if (isTruncated) {
            const filename = `pg_${uuidv4()}.csv`;
            const filepath = path.join(RESULTS_DIR, filename);
            fs.writeFileSync(filepath, arrayToCSV(allRows));
            response.result_file_path = filepath;
            console.log(`[PostgresExecutor] Saved ${totalRows} rows to ${filename}`);
        }

        return response;
    } finally {
        await client.end();
    }
};

module.exports = {
    executePostgresQuery
};

