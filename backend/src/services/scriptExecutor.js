const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');

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

    if (!fs.existsSync(scriptPath)) {
        throw new Error('Script file not found');
    }
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

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

    return { output: scriptResult, logs, errors };
};

module.exports = { executeScript };

