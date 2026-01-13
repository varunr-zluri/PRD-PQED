module.exports = {
    databases: [
        // Available postgres databases for test: ecommerce_db, hr_system, inventory_db, analytics_db
        {
            name: 'test-postgres',
            type: 'POSTGRESQL',
            host: 'localhost',
            port: 5433,
            user: 'postgres',
            password: 'password'
        },
        // Available Mongo databases: logs_db, customer_db, metrics_db, sessions_db
        {
            name: 'test-mongo',
            type: 'MONGODB',
            host: 'localhost',
            port: 27017,
            user: 'admin',
            password: 'password'
        }
    ]
};
