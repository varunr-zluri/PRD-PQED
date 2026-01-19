module.exports = {
    databases: [
        // Supabase PostgreSQL (Target Database for user queries)
        // Available databases: postgres (default)
        // Tables: warehouses, stock_levels
        {
            name: 'test-postgres',
            type: 'POSTGRESQL',
            host: 'aws-1-ap-south-1.pooler.supabase.com',
            port: 6543,
            user: 'postgres.smklgbartrwhbmwimire',
            password: 'test-postgres'
            // SSL enabled by default in executors
        },
        // MongoDB Atlas
        // Available databases: customer_db, logs_db, metrics_db, sessions_db
        // Collections: customers, app_logs, system_metrics, active_sessions
        {
            name: 'test-mongo',
            type: 'MONGODB',
            connectionString: 'mongodb+srv://mongo_pqed:test-mongo@test-mongo.sdj36ni.mongodb.net'
        }
    ]
};

