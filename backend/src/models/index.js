const Sequelize = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User');
const QueryRequest = require('./QueryRequest');
const QueryExecution = require('./QueryExecution');

// Define associations
User.hasMany(QueryRequest, { foreignKey: 'requester_id', as: 'requests' });
QueryRequest.belongsTo(User, { foreignKey: 'requester_id', as: 'requester' });

User.hasMany(QueryRequest, { foreignKey: 'approver_id', as: 'approvedRequests' });
QueryRequest.belongsTo(User, { foreignKey: 'approver_id', as: 'approver' });

QueryRequest.hasMany(QueryExecution, { foreignKey: 'query_request_id', as: 'executions' });
QueryExecution.belongsTo(QueryRequest, { foreignKey: 'query_request_id', as: 'request' });

const db = {
    User,
    QueryRequest,
    QueryExecution,
    sequelize,
    Sequelize
};

module.exports = db;
