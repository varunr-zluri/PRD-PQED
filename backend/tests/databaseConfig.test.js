/**
 * Database Config Tests
 * Tests for database.js module - simpler approach without breaking MikroORM
 */

// We need to test the module without initializing MikroORM
describe('Database Config Module', () => {
    beforeEach(() => {
        jest.resetModules();
    });

    describe('getORM without initialization', () => {
        it('should throw error when ORM not initialized', () => {
            // Import the actual module (not mocked)
            const { getORM } = require('../src/config/database');

            expect(() => getORM()).toThrow('ORM not initialized. Call initORM() first.');
        });
    });

    describe('getEM without initialization', () => {
        it('should throw error when called before initORM', () => {
            jest.resetModules();
            const { getEM } = require('../src/config/database');

            expect(() => getEM()).toThrow('ORM not initialized');
        });
    });

    describe('closeORM without initialization', () => {
        it('should not throw when called without initialization', async () => {
            jest.resetModules();
            const { closeORM } = require('../src/config/database');

            // Should not throw
            await expect(closeORM()).resolves.not.toThrow();
        });
    });

    describe('Module exports', () => {
        it('should export all required functions', () => {
            const database = require('../src/config/database');

            expect(database).toHaveProperty('initORM');
            expect(database).toHaveProperty('getORM');
            expect(database).toHaveProperty('getEM');
            expect(database).toHaveProperty('closeORM');
            expect(database).toHaveProperty('ormMiddleware');

            expect(typeof database.initORM).toBe('function');
            expect(typeof database.getORM).toBe('function');
            expect(typeof database.getEM).toBe('function');
            expect(typeof database.closeORM).toBe('function');
            expect(typeof database.ormMiddleware).toBe('function');
        });
    });
});
