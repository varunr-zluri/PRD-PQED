module.exports = {
    databases: [
        // PostgreSQL Instance (Docker container on port 5433)
        // Available databases: ecommerce_db, hr_system, inventory_db, analytics_db
        {
            name: 'test-postgres',
            type: 'POSTGRESQL',
            host: 'localhost',
            port: 5433,
            user: 'postgres',
            password: 'password'
        },
        // MongoDB Instance (Docker container on port 27017)
        // Available databases: logs_db, customer_db, metrics_db, sessions_db
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
