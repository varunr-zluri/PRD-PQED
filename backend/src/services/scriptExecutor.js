const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

const executeScript = async (instance, databaseName, scriptPath) => {
    const tempFiles = [];
    const env = {};

    try {
        if (instance.type === 'POSTGRESQL') {
            const config = {
                host: instance.host,
                port: instance.port,
                database: databaseName,
                user: instance.user,
                password: instance.password,
                ssl: false
            };
            const tempConfigFile = path.join(os.tmpdir(), `db-config-${uuidv4()}.json`);
            fs.writeFileSync(tempConfigFile, JSON.stringify(config));
            tempFiles.push(tempConfigFile);
            env.DB_CONFIG_FILE = tempConfigFile;
        } else if (instance.type === 'MONGODB') {
            const authPart = instance.user ? `${encodeURIComponent(instance.user)}:${encodeURIComponent(instance.password)}@` : '';
            env.MONGO_URI = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}?authSource=admin`;
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
                builtin: ['path', 'util'],
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
    } finally {
        tempFiles.forEach(file => {
            try {
                if (fs.existsSync(file)) fs.unlinkSync(file);
            } catch (e) { /* ignore cleanup errors */ }
        });
    }
};

module.exports = { executeScript };
