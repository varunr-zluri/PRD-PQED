const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const QueryRequest = sequelize.define('QueryRequest', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    requester_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    db_type: {
        type: DataTypes.ENUM('POSTGRESQL', 'MONGODB'),
        allowNull: false
    },
    instance_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    database_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    submission_type: {
        type: DataTypes.ENUM('QUERY', 'SCRIPT'),
        allowNull: false
    },
    query_content: {
        type: DataTypes.TEXT,
        allowNull: true // Required if submission_type is QUERY
    },
    script_path: {
        type: DataTypes.STRING,
        allowNull: true // Required if submission_type is SCRIPT
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    pod_name: {
        type: DataTypes.ENUM('pod-1', 'pod-2', 'pod-3', 'sre', 'de'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED'),
        defaultValue: 'PENDING'
    },

    approver_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    approved_at: {
        type: DataTypes.DATE,
        allowNull: true
    },
    rejected_reason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'query_requests',
    timestamps: true,
    underscored: true
});

module.exports = QueryRequest;
