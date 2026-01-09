const db = require('../src/models');
const bcrypt = require('bcryptjs');

const seedData = async () => {
    try {
        await db.sequelize.authenticate();
        console.log('Connected to database.');

        // Force sync to drop and recreate tables with new schema
        await db.sequelize.sync({ force: true });
        console.log('Database synced (force: true).');

        // Seed Users
        const users = [
            {
                email: 'admin@zluri.com',
                name: 'Admin User',
                password: 'password123',
                role: 'ADMIN',
                pod_id: null
            },
            {
                email: 'manager1@zluri.com',
                name: 'Manager Pod1',
                password: 'password123',
                role: 'MANAGER',
                pod_id: 'pod-1'
            },
            {
                email: 'dev1@zluri.com',
                name: 'Developer 1',
                password: 'password123',
                role: 'DEVELOPER',
                pod_id: 'pod-1'
            },
            {
                email: 'de-lead@zluri.com',
                name: 'DE Manager',
                password: 'password123',
                role: 'MANAGER',
                pod_id: 'de'
            }
        ];

        for (const user of users) {
            // Password hashing is handled by BeforeCreate hook
            await db.User.create(user);
        }
        console.log('Users seeded.');

        // Seed Database Instances
        const instances = [
            {
                name: 'primary-postgres',
                type: 'POSTGRESQL',
                host: 'localhost',
                port: 5432,
                credentials_encrypted: JSON.stringify({ user: 'postgres', password: 'password' })
            },
            {
                name: 'analytics-mongo',
                type: 'MONGODB',
                host: 'localhost',
                port: 27017,
                credentials_encrypted: JSON.stringify({ user: 'admin', password: 'password' })
            }
        ];

        for (const instance of instances) {
            await db.DatabaseInstance.create(instance);
        }
        console.log('Database Instances seeded.');

        console.log('Seeding complete. Exiting.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
};

seedData();
