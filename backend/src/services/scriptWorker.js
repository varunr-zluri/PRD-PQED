/**
 * Script Execution Worker
 * Runs user scripts in an isolated worker thread with vm2 sandboxing.
 * This allows the main thread to kill runaway scripts via worker.terminate()
 */
const { parentPort, workerData } = require('worker_threads');
const { NodeVM } = require('vm2');

const { scriptContent, env, scriptPath } = workerData;

const logs = [];
const errors = [];

/**
 * Safely serialize result for transfer to main thread.
 * Worker threads can't clone MongoDB ObjectIds, Dates may have issues, etc.
 * We JSON stringify and parse to ensure clean serialization.
 */
const safeSerialize = (obj) => {
    try {
        // JSON stringify converts ObjectId to string, handles circular refs, etc.
        return JSON.parse(JSON.stringify(obj));
    } catch (e) {
        // If serialization fails, return error info
        return {
            _serializationError: true,
            message: 'Result contains non-serializable data. Please ensure your script returns plain objects.',
            originalError: e.message
        };
    }
};

try {
    const vm = new NodeVM({
        console: 'redirect',
        sandbox: { process: { env } },
        require: {
            external: ['pg', 'mongodb', 'mongoose'],
            builtin: ['path', 'util'],  // No 'fs' - security: prevent file system access
            root: './node_modules',
        },
        timeout: 60000,  // Backup timeout (worker termination is primary)
        wasm: false
    });

    vm.on('console.log', (...args) => logs.push(args.join(' ')));
    vm.on('console.error', (...args) => errors.push(args.join(' ')));

    let result = vm.run(scriptContent, scriptPath);

    // Handle async scripts
    if (result && typeof result.then === 'function') {
        result.then((asyncResult) => {
            parentPort.postMessage({
                success: true,
                result: safeSerialize(asyncResult),
                logs,
                errors
            });
        }).catch((err) => {
            parentPort.postMessage({
                success: false,
                error: err.message,
                logs,
                errors
            });
        });
    } else {
        // Synchronous result
        parentPort.postMessage({
            success: true,
            result: safeSerialize(result),
            logs,
            errors
        });
    }
} catch (err) {
    parentPort.postMessage({
        success: false,
        error: err.message,
        logs,
        errors
    });
}
