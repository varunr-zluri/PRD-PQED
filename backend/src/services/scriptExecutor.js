const { VM } = require('vm2');
const { decrypt } = require('../utils/crypto');
const fs = require('fs');

const executeScript = async (instance, databaseName, scriptPath) => {
    const credentials = decrypt(instance.credentials_encrypted);

    // Prepare environment variables
    const sandboxFn = {
        console: {
            log: (...args) => { sandboxFn.stdout.push(args.join(' ')); },
            error: (...args) => { sandboxFn.stderr.push(args.join(' ')); }
        },
        stdout: [],
        stderr: []
    };

    // We need to inject connection info.
    // FR5.3 says: DB_CONFIG_FILE for PG, MONGO_URI for Mongo.
    // Since we know the instance type from request, we inject relevant ones.
    // But wait, the Script Submission might need BOTH? 
    // The UI shows "Select Instance", "Select Database", implies the script runs against THAT context.
    // So we provide connection details for that selected instance.

    const env = {};
    if (instance.type === 'POSTGRESQL') {
        env.DB_CONFIG = {
            host: instance.host,
            port: instance.port,
            database: databaseName,
            user: credentials.username,
            password: credentials.password
        };
    } else if (instance.type === 'MONGODB') {
        const authPart = credentials.username ? `${credentials.username}:${credentials.password}@` : '';
        env.MONGO_URI = `mongodb://${authPart}${instance.host}:${instance.port}/${databaseName}`;
    }

    // Read script content
    if (!fs.existsSync(scriptPath)) {
        throw new Error('Script file not found');
    }
    const scriptContent = fs.readFileSync(scriptPath, 'utf8');

    const vm = new VM({
        timeout: 60000, // 60s timeout
        sandbox: {
            process: { env },
            console: sandboxFn.console
        }
    });

    try {
        const result = vm.run(scriptContent);
        return {
            output: result,
            logs: sandboxFn.stdout,
            errors: sandboxFn.stderr
        };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    executeScript
};
