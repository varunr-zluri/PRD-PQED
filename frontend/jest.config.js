export default {
    testEnvironment: 'jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
    moduleNameMapper: {
        // Handle CSS imports (with CSS modules)
        '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
        // Handle CSS imports (without CSS modules)
        '^.+\\.(css|sass|scss)$': 'identity-obj-proxy',
        // Handle image imports
        '^.+\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$': '<rootDir>/__mocks__/fileMock.js'
    },
    transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
    },
    testMatch: [
        '<rootDir>/src/**/__tests__/**/*.{js,jsx}',
        '<rootDir>/src/**/*.{spec,test}.{js,jsx}'
    ],
    collectCoverageFrom: [
        'src/**/*.{js,jsx}',
        '!src/main.jsx',
        '!src/api/client.js',
        '!src/**/*.d.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 65,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    globals: {
        'import.meta': {
            env: {
                VITE_API_URL: 'http://localhost:3000/api'
            }
        }
    }
};

