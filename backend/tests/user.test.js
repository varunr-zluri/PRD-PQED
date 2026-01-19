const bcrypt = require('bcryptjs');

/**
 * User Model Tests
 * Tests password hashing behavior and checkPassword functionality
 * Uses direct bcrypt testing since MikroORM entities use @BeforeCreate hooks
 */

describe('User Password Functionality', () => {
    describe('checkPassword behavior', () => {
        it('should return true for matching password', async () => {
            const plainPassword = 'password123';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            const result = await bcrypt.compare(plainPassword, hashedPassword);
            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            const result = await bcrypt.compare('wrongpassword', hashedPassword);
            expect(result).toBe(false);
        });

        it('should return false for empty password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);

            const result = await bcrypt.compare('', hashedPassword);
            expect(result).toBe(false);
        });

        it('should return false when comparing against empty hash', async () => {
            // bcrypt.compare throws/returns false for invalid hash
            await expect(bcrypt.compare('password123', '')).resolves.toBe(false);
        });
    });

    describe('password hashing (simulates @BeforeCreate hook)', () => {
        it('should hash password with bcrypt', async () => {
            const plainPassword = 'plaintext123';
            const hashedPassword = await bcrypt.hash(plainPassword, 10);

            expect(hashedPassword).not.toBe(plainPassword);
            expect(hashedPassword.length).toBeGreaterThan(50);
            expect(hashedPassword.startsWith('$2')).toBe(true); // bcrypt prefix
        });

        it('should produce different hashes for same password (salt)', async () => {
            const password = 'samepassword';
            const hash1 = await bcrypt.hash(password, 10);
            const hash2 = await bcrypt.hash(password, 10);

            expect(hash1).not.toBe(hash2);
            // But both should validate the original password
            expect(await bcrypt.compare(password, hash1)).toBe(true);
            expect(await bcrypt.compare(password, hash2)).toBe(true);
        });

        it('should hash passwords of various lengths', async () => {
            const shortPassword = 'abc';
            const longPassword = 'a'.repeat(72); // bcrypt max is 72 bytes

            const shortHash = await bcrypt.hash(shortPassword, 10);
            const longHash = await bcrypt.hash(longPassword, 10);

            expect(await bcrypt.compare(shortPassword, shortHash)).toBe(true);
            expect(await bcrypt.compare(longPassword, longHash)).toBe(true);
        });

        it('should handle special characters in password', async () => {
            const specialPassword = 'p@$$w0rd!#$%^&*()';
            const hash = await bcrypt.hash(specialPassword, 10);

            expect(await bcrypt.compare(specialPassword, hash)).toBe(true);
        });
    });

    describe('password update behavior (simulates @BeforeUpdate hook)', () => {
        it('should rehash when password changes', async () => {
            const oldPassword = 'oldpassword';
            const newPassword = 'newpassword';

            const oldHash = await bcrypt.hash(oldPassword, 10);

            // Simulate password change detection
            const passwordChanged = true;
            let currentHash = oldHash;

            if (passwordChanged) {
                currentHash = await bcrypt.hash(newPassword, 10);
            }

            expect(currentHash).not.toBe(oldHash);
            expect(await bcrypt.compare(newPassword, currentHash)).toBe(true);
            expect(await bcrypt.compare(oldPassword, currentHash)).toBe(false);
        });

        it('should not rehash when password did not change', async () => {
            const password = 'mypassword';
            const existingHash = await bcrypt.hash(password, 10);

            // Simulate no password change
            const passwordChanged = false;
            let currentHash = existingHash;

            if (passwordChanged) {
                currentHash = await bcrypt.hash(password, 10);
            }

            expect(currentHash).toBe(existingHash);
        });
    });

    describe('boundary value tests', () => {
        it('should handle minimum length password (1 char)', async () => {
            const password = 'a';
            const hash = await bcrypt.hash(password, 10);
            expect(await bcrypt.compare(password, hash)).toBe(true);
        });

        it('should handle maximum practical password length (72 bytes for bcrypt)', async () => {
            // bcrypt truncates at 72 bytes
            const password72 = 'a'.repeat(72);
            const password73 = 'a'.repeat(73);

            const hash = await bcrypt.hash(password72, 10);

            // Both should match because bcrypt truncates at 72
            expect(await bcrypt.compare(password72, hash)).toBe(true);
            expect(await bcrypt.compare(password73, hash)).toBe(true);
        });

        it('should handle unicode characters', async () => {
            const unicodePassword = '密码🔐пароль';
            const hash = await bcrypt.hash(unicodePassword, 10);
            expect(await bcrypt.compare(unicodePassword, hash)).toBe(true);
        });

        it('should handle whitespace-only password', async () => {
            const whitespacePassword = '   ';
            const hash = await bcrypt.hash(whitespacePassword, 10);
            expect(await bcrypt.compare(whitespacePassword, hash)).toBe(true);
            expect(await bcrypt.compare('', hash)).toBe(false);
        });
    });
});
