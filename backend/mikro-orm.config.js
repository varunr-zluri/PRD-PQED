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
    pool: {
        min: 0,
        max: 5,
    },
    schemaGenerator: {
        disableForeignKeys: false, // wrap statements with set_config() to disable foreign key checks
        createForeignKeyConstraints: true, // whether to generate FK constraints
        ignoreSchema: [], // duplicate of ignoreSchema option, just for clarity 
    },
});
