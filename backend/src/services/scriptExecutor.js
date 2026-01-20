/**
 * Script Executor with Worker Thread Isolation
 * 
 * Executes user scripts in a separate worker thread to:
 * 1. Prevent infinite loops from crashing the server
 * 2. Enforce timeouts by terminating the worker
 * 3. Isolate script execution from the main event loop
 */
const { Worker } = require('worker_threads');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { uploadString } = require('../utils/cloudStorage');

const MAX_ROWS = 100;
const SCRIPT_TIMEOUT_MS = 60000; // 60 seconds

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

/**
 * Execute script in an isolated worker thread with timeout enforcement
 */
const executeScript = async (instance, databaseName, scriptPath) => {
    // Prepare environment variables with database connection info
    const env = {};

    if (instance.type === 'POSTGRESQL') {
        const config = {
            host: instance.host,
            port: instance.port,
            database: databaseName,
            user: instance.user,
            password: instance.password,
            ssl: instance.ssl !== undefined ? instance.ssl : { rejectUnauthorized: false }
        };
        env.DB_CONFIG = JSON.stringify(config);
    } else if (instance.type === 'MONGODB') {
        if (instance.connectionString) {
            env.MONGO_URI = instance.connectionString.replace('/?', `/${databaseName}?`);
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
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Script file not found');
        }
        scriptContent = fs.readFileSync(scriptPath, 'utf8');
    }

    // Execute in worker thread with timeout
    return new Promise((resolve, reject) => {
        const workerPath = path.join(__dirname, 'scriptWorker.js');

        const worker = new Worker(workerPath, {
            workerData: {
                scriptContent,
                env,
                scriptPath
            }
        });

        // Timeout handler - terminates worker after SCRIPT_TIMEOUT_MS
        const timeoutId = setTimeout(() => {
            worker.terminate();
            reject(new Error('Script execution timed out: The script took longer than 60 seconds to complete and was terminated. Please optimize your script or break it into smaller operations.'));
        }, SCRIPT_TIMEOUT_MS);

        // Handle worker messages (script completed)
        worker.on('message', async (message) => {
            clearTimeout(timeoutId);

            if (!message.success) {
                reject(new Error(message.error));
                return;
            }

            // Process the result
            let scriptResult = message.result;
            let logs = message.logs || [];
            let errors = message.errors || [];

            // Handle truncation for array results
            let rows = scriptResult;
            let is_truncated = false;
            let total_rows = null;
            let result_file_path = null;

            if (Array.isArray(scriptResult) && scriptResult.length > 0) {
                total_rows = scriptResult.length;
                is_truncated = total_rows > MAX_ROWS;

                if (is_truncated) {
                    rows = scriptResult.slice(0, MAX_ROWS);
                    try {
                        const filename = `script_${require('crypto').randomUUID()}`;
                        const csvContent = arrayToCSV(scriptResult);
                        result_file_path = await uploadString(csvContent, filename);
                        console.log(`[ScriptExecutor] Uploaded ${total_rows} rows to Cloudinary`);
                    } catch (err) {
                        console.error('[ScriptExecutor] Failed to upload CSV:', err.message);
                    }
                }
            }

            resolve({
                output: rows,
                logs,
                errors,
                rows: Array.isArray(rows) ? rows : undefined,
                is_truncated,
                total_rows,
                result_file_path
            });
        });

        // Handle worker errors
        worker.on('error', (err) => {
            clearTimeout(timeoutId);
            reject(new Error(`Script execution failed: ${err.message}`));
        });

        // Handle worker exit (unexpected termination)
        worker.on('exit', (code) => {
            clearTimeout(timeoutId);
            if (code !== 0) {
                // Worker was terminated (likely by our timeout)
                // Error already handled by timeout handler
            }
        });
    });
};

module.exports = { executeScript };
