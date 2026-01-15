// Backward compatibility shim - redirects to new entities
// This file will be removed after tests are updated
const { User, QueryRequest, QueryExecution } = require('../entities');
const { getORM, getEM } = require('../config/database');

module.exports = {
    User,
    QueryRequest,
    QueryExecution,
    // Provide sequelize-like interface for tests that mock it
    sequelize: {
        authenticate: async () => {
            const orm = getORM();
            return orm.isConnected();
        },
        sync: async () => {
            const orm = getORM();
            const generator = orm.getSchemaGenerator();
            return generator.updateSchema();
        }
    }
};
