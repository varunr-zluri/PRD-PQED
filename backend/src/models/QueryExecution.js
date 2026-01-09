const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QueryExecution = sequelize.define('QueryExecution', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    query_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'query_requests',
            key: 'id'
        }
    },
    status: {
        type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
        allowNull: false
    },
    result_data: {
        type: DataTypes.TEXT, // Using TEXT for potentially large JSON/CSV strings
        allowNull: true
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    executed_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'query_executions',
    timestamps: true,
    underscored: true
});

module.exports = QueryExecution;
