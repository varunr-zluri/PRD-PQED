const app = require('./app');
const config = require('./config/env');
const db = require('./models');

const startServer = async () => {
    try {
        // Authenticate with database
        await db.sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // Sync models (using force: false to not drop tables, alter: true to update schema)
        await db.sequelize.sync({ alter: true });
        console.log('Database models synchronized.');

        app.listen(config.port, () => {
            console.log(`Server running on port ${config.port} in ${config.env} mode`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};

startServer();
