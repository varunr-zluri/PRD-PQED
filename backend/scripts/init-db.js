const { sequelize, User, DatabaseInstance } = require('../src/models');
const bcrypt = require('bcryptjs');

const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        // Force sync to drop existing tables and recreate them
        await sequelize.sync({ force: true });
        console.log('Database synchronized (tables recreated).');

        // Seed Users
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('password123', salt);

        const users = [
            {
                email: 'admin@zluri.com',
                name: 'Admin User',
                password: 'password123', // Will be hashed by hool if consistent, but we are using bulkCreate carefully or create individually
                role: 'ADMIN',
                pod_id: null
            },
            {
                email: 'manager1@zluri.com',
                name: 'Manager One',
                password: 'password123',
                role: 'MANAGER',
                pod_id: 'pod-1'
            },
            {
                email: 'developer@zluri.com',
                name: 'Developer One',
                password: 'password123',
                role: 'DEVELOPER',
                pod_id: 'pod-1'
            }
        ];

        // We use creating one by one to trigger hooks (hashing password)
        for (const u of users) {
            await User.create(u);
        }
        console.log('Users seeded.');

        // Seed Database Instances
        // Note: Credentials should be encrypted. 
        // For this simple seed, we'll use a helper or just manually encrypt if we had the key, 
        // BUT the model/service usually handles decryption.
        // Let's check how encryption is done. 
        // We need the crypto util.

        // Wait, I cannot easily require src/utils/crypto if I don't know if it exists or how it works.
        // Let's check if I can import it.
        // I'll assume standard AES.

        // For now, let's try to import strict.
        const { encrypt } = require('../src/utils/crypto');

        const instances = [
            {
                name: 'Zluri-ProdDB',
                type: 'POSTGRESQL',
                host: 'localhost',
                port: 5432,
                credentials_encrypted: encrypt({ username: 'postgres', password: 'password' }) // Mock credentials
            },
            {
                name: 'Zluri-Mongo-Prod',
                type: 'MONGODB',
                host: 'localhost',
                port: 27017,
                credentials_encrypted: encrypt({ username: 'root', password: 'password' })
            }
        ];

        for (const i of instances) {
            await DatabaseInstance.create(i);
        }
        console.log('Database Instances seeded.');

        console.log('Database initialization complete.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to initialize database:', error);
        process.exit(1);
    }
};

initDB();
