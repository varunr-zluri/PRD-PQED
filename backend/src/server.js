const app = require('./app');
const config = require('./config/env');
const { initORM, getORM, closeORM } = require('./config/database');

const startServer = async () => {
    try {
        // Initialize MikroORM
        const orm = await initORM();
        console.log('MikroORM connection has been established successfully.');

        // Sync schema (create tables if they don't exist, update if needed)
        const generator = orm.getSchemaGenerator();
        await generator.updateSchema();
        console.log('Database schema synchronized.');

        const server = app.listen(config.port, () => {
            console.log(`Server running on port ${config.port} in ${config.env} mode`);
        });

        // Graceful shutdown
        const shutdown = async () => {
            console.log('Shutting down gracefully...');
            server.close();
            await closeORM();
            process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();
