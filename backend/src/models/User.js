const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    pod_name: {
        type: DataTypes.ENUM('pod-1', 'pod-2', 'pod-3', 'sre', 'de'),
        allowNull: true // Optional for admins
    },
    role: {
        type: DataTypes.ENUM('DEVELOPER', 'MANAGER', 'ADMIN'),
        defaultValue: 'DEVELOPER'
    }
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true
});

// Instance method to check password
User.prototype.checkPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Hook to hash password before saving
User.beforeCreate(async (user) => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

User.beforeUpdate(async (user) => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
    }
});

module.exports = User;
