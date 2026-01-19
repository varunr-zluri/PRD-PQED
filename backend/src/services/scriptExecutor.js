const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
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

const executeScript = async (instance, databaseName, scriptPath) => {
    // Prepare environment variables with database connection info
    const env = {};

    if (instance.type === 'POSTGRESQL') {
        // Inject PostgreSQL config as JSON string in env var
        // Scripts should use: JSON.parse(process.env.DB_CONFIG)
        const config = {
            host: instance.host,
            port: instance.port,
            database: databaseName,
            user: instance.user,
            password: instance.password,
            // Use instance.ssl if defined, otherwise enable SSL for cloud compatibility
            ssl: instance.ssl !== undefined ? instance.ssl : { rejectUnauthorized: false }
        };
        env.DB_CONFIG = JSON.stringify(config);
    } else if (instance.type === 'MONGODB') {
        // Inject MongoDB URI - support both Atlas SRV and standard connections
        if (instance.connectionString) {
            // Use provided connection string (for Atlas SRV)
            env.MONGO_URI = instance.connectionString.replace('/?', `/${databaseName}?`);
            // Handle case where there's no query string
            if (!env.MONGO_URI.includes('?')) {
                env.MONGO_URI = `${instance.connectionString}/${databaseName}`;
            }
        } else {
            const authPart = instance.user ? `${encodeURIComponent(instance.user)}:${encodeURIComponent(instance.password)}@` : '';
            env.MONGO_URI = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}?authSource=admin`;
        }
    }

    let scriptContent;

    // Check if scriptPath is a URL (Cloudinary) or local path
    if (scriptPath.startsWith('http')) {
        try {
            const response = await axios.get(scriptPath, { responseType: 'text' });
            scriptContent = response.data;
        } catch (error) {
            throw new Error(`Failed to fetch script from URL: ${error.message}`);
        }
    } else {
        // Fallback for local testing or legacy paths
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Script file not found');
        }
        scriptContent = fs.readFileSync(scriptPath, 'utf8');
    }

    let logs = [];
    let errors = [];

    const vm = new NodeVM({
        console: 'redirect',
        sandbox: { process: { env } },
        require: {
            external: ['pg', 'mongodb', 'mongoose'],
            builtin: ['path', 'util'],  // No 'fs' - security: prevent file system access
            root: './node_modules',
        },
        timeout: 60000,
        wasm: false
    });

    vm.on('console.log', (...args) => logs.push(args.join(' ')));
    vm.on('console.error', (...args) => errors.push(args.join(' ')));

    let scriptResult = vm.run(scriptContent, scriptPath);

    if (scriptResult && typeof scriptResult.then === 'function') {
        scriptResult = await scriptResult;
    }

    // Handle truncation for array results (like query results)
    let rows = scriptResult;
    let is_truncated = false;
    let total_rows = null;
    let result_file_path = null;

    if (Array.isArray(scriptResult) && scriptResult.length > 0) {
        total_rows = scriptResult.length;
        is_truncated = total_rows > MAX_ROWS;

        if (is_truncated) {
            rows = scriptResult.slice(0, MAX_ROWS);
            // Upload full results to Cloudinary
            try {
                const { v4: uuidv4 } = require('uuid');
                const filename = `script_${uuidv4()}`;
                const csvContent = arrayToCSV(scriptResult);
                result_file_path = await uploadString(csvContent, filename);
                console.log(`[ScriptExecutor] Uploaded ${total_rows} rows to Cloudinary`);
            } catch (err) {
                console.error('[ScriptExecutor] Failed to upload CSV:', err.message);
            }
        }
    }

    return {
        output: rows,
        logs,
        errors,
        // Include truncation metadata (same format as query executors)
        rows: Array.isArray(rows) ? rows : undefined,
        is_truncated,
        total_rows,
        result_file_path
    };
};

module.exports = { executeScript };


