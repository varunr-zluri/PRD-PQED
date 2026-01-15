const { UserSchema } = require('./src/entities/User.entity');
const { QueryRequestSchema } = require('./src/entities/QueryRequest.entity');
const { QueryExecutionSchema } = require('./src/entities/QueryExecution.entity');
const config = require('./src/config/env');

module.exports = {
    entities: [UserSchema, QueryRequestSchema, QueryExecutionSchema],
    dbName: config.db.name,
    host: config.db.host,
    port: parseInt(config.db.port),
    user: config.db.user,
    password: config.db.password,
    type: 'postgresql',
    debug: config.env === 'development',
    allowGlobalContext: true,
    pool: {
        min: 0,
        max: 5,
    }
};
