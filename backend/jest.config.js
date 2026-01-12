module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.test.js'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'clover'],
    testTimeout: 10000,
    verbose: true,
    moduleNameMapper: {
        '^uuid$': '<rootDir>/tests/__mocks__/uuid.js'
    }
};
