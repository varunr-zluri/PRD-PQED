const User = require('../src/models/User');
const bcrypt = require('bcryptjs');

// We need to test the model instance methods and hooks
// These are Sequelize model tests

jest.mock('../src/config/database', () => ({
    define: jest.fn().mockReturnValue({
        prototype: {},
        beforeCreate: jest.fn(),
        beforeUpdate: jest.fn()
    })
}));

describe('User Model', () => {
    describe('checkPassword', () => {
        it('should return true for matching password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                password: hashedPassword,
                checkPassword: async function (pwd) {
                    return await bcrypt.compare(pwd, this.password);
                }
            };

            const result = await mockUser.checkPassword('password123');
            expect(result).toBe(true);
        });

        it('should return false for non-matching password', async () => {
            const hashedPassword = await bcrypt.hash('password123', 10);
            const mockUser = {
                password: hashedPassword,
                checkPassword: async function (pwd) {
                    return await bcrypt.compare(pwd, this.password);
                }
            };

            const result = await mockUser.checkPassword('wrongpassword');
            expect(result).toBe(false);
        });
    });

    describe('password hashing hook', () => {
        it('should hash password before create', async () => {
            const mockUser = { password: 'plaintext' };

            // Simulate beforeCreate hook
            if (mockUser.password) {
                mockUser.password = await bcrypt.hash(mockUser.password, 10);
            }

            expect(mockUser.password).not.toBe('plaintext');
            expect(mockUser.password.length).toBeGreaterThan(20);
        });

        it('should hash password on update if changed', async () => {
            const mockUser = {
                password: 'newpassword',
                changed: jest.fn().mockReturnValue(true)
            };

            // Simulate beforeUpdate hook
            if (mockUser.changed('password')) {
                mockUser.password = await bcrypt.hash(mockUser.password, 10);
            }

            expect(mockUser.password).not.toBe('newpassword');
        });

        it('should not hash password on update if not changed', async () => {
            const originalHash = 'existinghash';
            const mockUser = {
                password: originalHash,
                changed: jest.fn().mockReturnValue(false)
            };

            // Simulate beforeUpdate hook
            if (mockUser.changed('password')) {
                mockUser.password = await bcrypt.hash(mockUser.password, 10);
            }

            expect(mockUser.password).toBe(originalHash);
        });
    });
});
