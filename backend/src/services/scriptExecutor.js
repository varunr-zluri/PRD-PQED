const { NodeVM } = require('vm2');
const { decrypt } = require('../utils/crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const executeScript = async (instance, databaseName, scriptPath) => {
    const credentials = decrypt(instance.credentials_encrypted);

    // Prepare temporary files list for cleanup
    const tempFiles = [];

    // Prepare environment variables
    const env = {};

    try {
        if (instance.type === 'POSTGRESQL') {
            const config = {
                host: instance.host,
                port: instance.port,
                database: databaseName,
                user: credentials.username,
                password: credentials.password,
                ssl: { rejectUnauthorized: false } // Assuming typical cloud DB requirement
            };

            // Create temporary config file
            const tempConfigFile = path.join(os.tmpdir(), `db-config-${uuidv4()}.json`);
            fs.writeFileSync(tempConfigFile, JSON.stringify(config));
            tempFiles.push(tempConfigFile);

            env.DB_CONFIG_FILE = tempConfigFile;

        } else if (instance.type === 'MONGODB') {
            const authPart = credentials.username ? `${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}@` : '';
            env.MONGO_URI = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}`;
        }

        // Read script content
        if (!fs.existsSync(scriptPath)) {
            throw new Error('Script file not found');
        }
        const scriptContent = fs.readFileSync(scriptPath, 'utf8');

        // Initialize NodeVM
        // We allow 'console' to work naturally, but we might want to capture it.
        // NodeVM by default sends console output to the host's console. 
        // We need to override generic console to capture logs.

        let logs = [];
        let errors = [];

        const vm = new NodeVM({
            console: 'redirect',
            sandbox: {
                process: {
                    env: env
                }
            },
            require: {
                external: ['pg', 'mongodb', 'mongoose'],
                builtin: ['fs', 'path', 'os', 'util'], // Basic builtins
                root: './', // Allow requiring local modules if needed? Probably not for safety.
            },
            timeout: 60000 // 60s timeout
        });

        // Capture logs
        vm.on('console.log', (...args) => {
            logs.push(args.join(' '));
        });
        vm.on('console.error', (...args) => {
            errors.push(args.join(' '));
        });

        // Execute
        // We wrap the user script in a way that allows async execution if they export a function or just run top-level.
        // But FR says "Return script output as result". 
        // We'll treat the return value of the script (module.exports or last expression) as the result if possible,
        // or just rely on what they print. 
        // Let's assume the script just runs.

        const scriptResult = vm.run(scriptContent, scriptPath);

        return {
            output: scriptResult, // This might be undefined if they just log things
            logs: logs,
            errors: errors
        };

    } catch (error) {
        throw error;
    } finally {
        // Cleanup temporary files
        tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) {
                    fs.unlinkSync(file);
                }
            } catch (e) {
                console.error(`Failed to delete temp file ${file}:`, e);
            }
        });
    }
};

module.exports = {
    executeScript
};
