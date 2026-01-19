const { Client } = require('pg');
const crypto = require('crypto');
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

        // If truncated, upload full result to Cloudinary
        if (isTruncated) {
            const filename = `pg_${crypto.randomUUID()}`;
            const csvContent = arrayToCSV(allRows);
            const cloudUrl = await uploadString(csvContent, filename);
            response.result_file_path = cloudUrl;
            console.log(`[PostgresExecutor] Uploaded ${totalRows} rows to Cloudinary`);
        }

        return response;
    } finally {
        await client.end();
    }
};

module.exports = {
    executePostgresQuery
};

