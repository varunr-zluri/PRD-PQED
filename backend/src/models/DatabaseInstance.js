      const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DatabaseInstance = sequelize.define('DatabaseInstance', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('POSTGRESQL', 'MONGODB'),
        allowNull: false
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false
    },
    port: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    credentials_encrypted: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'JSON string of encrypted username/password'
    }
}, {
    tableName: 'database_instances',
    timestamps: true,
    underscored: true
});

module.exports = DatabaseInstance;
