const { defineConfig } = require('@mikro-orm/postgresql');
const { UserSchema } = require('./src/entities/User.entity');
const { QueryRequestSchema } = require('./src/entities/QueryRequest.entity');
const { QueryExecutionSchema } = require('./src/entities/QueryExecution.entity');
const config = require('./src/config/env');

module.exports = defineConfig({
    entities: [UserSchema, QueryRequestSchema, QueryExecutionSchema],
    dbName: config.db.name,
    host: config.db.host,
    port: parseInt(config.db.port),
    user: config.db.user,
    password: config.db.password,
    debug: config.env === 'development',
    allowGlobalContext: true,
    // Restrict to public schema only (for Supabase compatibility)
    schema: 'public',
    // SSL required for Supabase
    driverOptions: {
        connection: {
            ssl: { rejectUnauthorized: false }
        }
    },
    pool: {
        min: 0,
        max: 5,
    },
    schemaGenerator: {
        disableForeignKeys: false,
        createForeignKeyConstraints: true,
        // Ignore Supabase internal schemas
        ignoreSchema: ['auth', 'storage', 'extensions', 'realtime', 'supabase_functions', 'graphql', 'graphql_public', 'pgsodium', 'pgsodium_masks', 'vault'],
    },
});

