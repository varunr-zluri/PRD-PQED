/**
 * Tests for Destructive Query Detection Service
 */
const { detectDestructiveOperations } = require('../src/services/destructiveDetector');

describe('detectDestructiveOperations', () => {
    describe('Empty/null content', () => {
        it('should return safe for null content', () => {
            const result = detectDestructiveOperations(null, 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(false);
            expect(result.warnings).toEqual([]);
        });

        it('should return safe for empty string', () => {
            const result = detectDestructiveOperations('', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(false);
            expect(result.warnings).toEqual([]);
        });
    });

    describe('PostgreSQL destructive patterns', () => {
        it('should detect DROP TABLE', () => {
            const result = detectDestructiveOperations('DROP TABLE users', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('should detect DROP DATABASE', () => {
            const result = detectDestructiveOperations('DROP DATABASE mydb', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect TRUNCATE', () => {
            const result = detectDestructiveOperations('TRUNCATE TABLE logs', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect DELETE FROM', () => {
            const result = detectDestructiveOperations('DELETE FROM users WHERE id = 1', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect ALTER TABLE', () => {
            const result = detectDestructiveOperations('ALTER TABLE users ADD COLUMN age INT', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect UPDATE SET', () => {
            const result = detectDestructiveOperations("UPDATE users SET name = 'John'", 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect INSERT INTO', () => {
            const result = detectDestructiveOperations("INSERT INTO users (name) VALUES ('John')", 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect CREATE OR REPLACE', () => {
            const result = detectDestructiveOperations('CREATE OR REPLACE FUNCTION test() RETURNS void', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should not flag SELECT queries', () => {
            const result = detectDestructiveOperations('SELECT * FROM users', 'POSTGRESQL', 'QUERY');
            expect(result.isDestructive).toBe(false);
        });
    });

    describe('MongoDB destructive patterns', () => {
        it('should detect .drop()', () => {
            const result = detectDestructiveOperations('db.users.drop()', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect .deleteOne()', () => {
            const result = detectDestructiveOperations('db.users.deleteOne({ id: 1 })', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect .deleteMany()', () => {
            const result = detectDestructiveOperations('db.users.deleteMany({})', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect .updateOne()', () => {
            const result = detectDestructiveOperations('db.users.updateOne({ id: 1 }, { $set: { name: "John" } })', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect .insertMany()', () => {
            const result = detectDestructiveOperations('db.users.insertMany([{ name: "John" }])', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect $set operator', () => {
            const result = detectDestructiveOperations('{ $set: { field: "value" } }', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect $unset operator', () => {
            const result = detectDestructiveOperations('{ $unset: { field: 1 } }', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect $push operator', () => {
            const result = detectDestructiveOperations('{ $push: { items: "new" } }', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(true);
        });

        it('should not flag .find() queries', () => {
            const result = detectDestructiveOperations('db.users.find({ name: "John" })', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(false);
        });

        it('should not flag .aggregate() read operations', () => {
            const result = detectDestructiveOperations('db.users.aggregate([{ $match: { age: 18 } }])', 'MONGODB', 'QUERY');
            expect(result.isDestructive).toBe(false);
        });
    });

    describe('Script destructive patterns', () => {
        it('should detect .drop() in scripts', () => {
            const result = detectDestructiveOperations('async function run() { await db.coll.drop(); }', 'POSTGRESQL', 'SCRIPT');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect .delete in scripts', () => {
            const result = detectDestructiveOperations('await collection.deleteOne({ id: 1 });', 'MONGODB', 'SCRIPT');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect SQL DELETE in scripts', () => {
            const result = detectDestructiveOperations('await client.query("DELETE FROM users")', 'POSTGRESQL', 'SCRIPT');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect DROP in scripts', () => {
            const result = detectDestructiveOperations('await client.query("DROP TABLE test")', 'POSTGRESQL', 'SCRIPT');
            expect(result.isDestructive).toBe(true);
        });

        it('should detect UPDATE SET in scripts', () => {
            const result = detectDestructiveOperations("await client.query('UPDATE users SET active = false')", 'POSTGRESQL', 'SCRIPT');
            expect(result.isDestructive).toBe(true);
        });

        it('should not flag SELECT queries in scripts', () => {
            const result = detectDestructiveOperations('await client.query("SELECT * FROM users")', 'POSTGRESQL', 'SCRIPT');
            expect(result.isDestructive).toBe(false);
        });
    });

    describe('Multiple warnings and deduplication', () => {
        it('should limit warnings to 5', () => {
            // Content with many destructive patterns
            const content = `
                DROP TABLE a;
                TRUNCATE b;
                DELETE FROM c;
                ALTER TABLE d;
                UPDATE e SET f = 1;
                INSERT INTO g;
                CREATE OR REPLACE h;
            `;
            const result = detectDestructiveOperations(content, 'POSTGRESQL', 'QUERY');
            expect(result.warnings.length).toBeLessThanOrEqual(5);
        });
    });
});
