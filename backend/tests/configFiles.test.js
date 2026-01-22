/**
 * Config Files Coverage Tests
 * Tests for src/config modules
 */

describe('Config Module Coverage', () => {
    describe('env.js', () => {
        beforeEach(() => {
            jest.resetModules();
        });

        it('should export required config properties', () => {
            const config = require('../src/config/env');

            expect(config).toHaveProperty('env');
            expect(config).toHaveProperty('port');
            expect(config).toHaveProperty('db');
            expect(config).toHaveProperty('jwt');
            expect(config).toHaveProperty('encKey');
            expect(config).toHaveProperty('frontendUrl');
        });

        it('should have db config with all properties', () => {
            const config = require('../src/config/env');

            expect(config.db).toHaveProperty('host');
            expect(config.db).toHaveProperty('port');
            expect(config.db).toHaveProperty('name');
            expect(config.db).toHaveProperty('user');
            expect(config.db).toHaveProperty('password');
        });

        it('should have jwt config with secret', () => {
            const config = require('../src/config/env');

            expect(config.jwt).toHaveProperty('secret');
        });

        it('should use fallback values when env vars not set', () => {
            // Save original values
            const originalEnv = { ...process.env };

            // Clear specific env vars
            delete process.env.NODE_ENV;
            delete process.env.PORT;

            jest.resetModules();
            const config = require('../src/config/env');

            // Verify fallback values are used (port returns string or number)
            expect(config.env).toBe('development');
            expect(Number(config.port)).toBe(3000);

            // Restore
            process.env = originalEnv;
        });

        it('should use environment variables when set', () => {
            const originalEnv = { ...process.env };

            process.env.NODE_ENV = 'production';
            process.env.PORT = '8080';

            jest.resetModules();
            const config = require('../src/config/env');

            expect(config.env).toBe('production');
            expect(Number(config.port)).toBe(8080);

            // Restore
            process.env = originalEnv;
        });
    });

    describe('databases.js', () => {
        it('should export databases array', () => {
            const { databases } = require('../src/config/databases');

            expect(Array.isArray(databases)).toBe(true);
            expect(databases.length).toBeGreaterThan(0);
        });

        it('should have postgres instance with required properties', () => {
            const { databases } = require('../src/config/databases');

            const postgres = databases.find(db => db.type === 'POSTGRESQL');
            expect(postgres).toBeDefined();
            expect(postgres).toHaveProperty('name');
            expect(postgres).toHaveProperty('host');
            expect(postgres).toHaveProperty('port');
            expect(postgres).toHaveProperty('user');
            expect(postgres).toHaveProperty('password');
        });

        it('should have mongodb instance with connectionString', () => {
            const { databases } = require('../src/config/databases');

            const mongo = databases.find(db => db.type === 'MONGODB');
            expect(mongo).toBeDefined();
            expect(mongo).toHaveProperty('name');
            expect(mongo).toHaveProperty('connectionString');
        });

        it('should have postgres type set correctly', () => {
            const { databases } = require('../src/config/databases');

            const postgres = databases.find(db => db.name === 'test-postgres');
            expect(postgres.type).toBe('POSTGRESQL');
        });

        it('should have mongodb type set correctly', () => {
            const { databases } = require('../src/config/databases');

            const mongo = databases.find(db => db.name === 'test-mongo');
            expect(mongo.type).toBe('MONGODB');
        });
    });

    describe('pods.json', () => {
        it('should be valid JSON with pods array', () => {
            const pods = require('../src/config/pods.json');

            expect(pods).toHaveProperty('pods');
            expect(Array.isArray(pods.pods)).toBe(true);
        });

        it('should have pod entries with pod_name and display_name', () => {
            const { pods } = require('../src/config/pods.json');

            pods.forEach(pod => {
                expect(pod).toHaveProperty('pod_name');
                expect(pod).toHaveProperty('display_name');
            });
        });

        it('should have all expected pod names', () => {
            const { pods } = require('../src/config/pods.json');
            const podNames = pods.map(p => p.pod_name);

            expect(podNames).toContain('pod-1');
            expect(podNames).toContain('pod-2');
        });
    });

    // Note: database.js is covered by integration tests throughout the suite.
    // Direct unit testing of database.js is skipped because MikroORM's import chain
    // makes it impossible to mock properly (TypeError: Class extends value undefined)
});
