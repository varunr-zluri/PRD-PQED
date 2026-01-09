module.exports = {
    databases: [
        {
            name: 'primary-postgres',
            type: 'POSTGRESQL',
            host: 'localhost',
            port: 5432,
            user: 'postgres',
            password: 'password', // In production, use process.env.DB_PASSWORD
            database: 'postgres' // Default DB to connect to for listing other DBs
        },
        {
            name: 'analytics-mongo',
            type: 'MONGODB',
            host: 'localhost',
            port: 27017,
            user: 'admin',
            password: 'password', // In production, use process.env.MONGO_PASSWORD
            database: 'admin' // Default DB to connect to
        }
    ]
};
