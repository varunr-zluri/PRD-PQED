/**
 * App Error Handler Tests
 * Tests that trigger the Express error handler middleware
 */

const request = require('supertest');
const express = require('express');

describe('Express Error Handler', () => {
    let testApp;

    beforeEach(() => {
        // Create a test app that mimics the real app's error handler
        testApp = express();
        testApp.use(express.json());

        // Add a route that throws an error
        testApp.get('/error', (req, res, next) => {
            const err = new Error('Test error');
            next(err);
        });

        // Add a route that throws synchronously
        testApp.get('/sync-error', (req, res) => {
            throw new Error('Sync error');
        });

        // Add the error handler from app.js
        testApp.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({
                status: 'error',
                message: err.message || 'Internal Server Error'
            });
        });
    });

    it('should handle async errors', async () => {
        const res = await request(testApp).get('/error');

        expect(res.statusCode).toEqual(500);
        expect(res.body.status).toBe('error');
        expect(res.body.message).toBe('Test error');
    });

    it('should handle sync errors', async () => {
        const res = await request(testApp).get('/sync-error');

        expect(res.statusCode).toEqual(500);
        expect(res.body.status).toBe('error');
    });

    it('should use default message if none provided', async () => {
        // Override to test default message
        testApp = express();
        testApp.use(express.json());

        testApp.get('/no-message-error', (req, res, next) => {
            const err = new Error();
            err.message = '';
            next(err);
        });

        testApp.use((err, req, res, next) => {
            console.error(err.stack);
            res.status(500).json({
                status: 'error',
                message: err.message || 'Internal Server Error'
            });
        });

        const res = await request(testApp).get('/no-message-error');

        expect(res.statusCode).toEqual(500);
        expect(res.body.message).toBe('Internal Server Error');
    });
});

describe('App Routes Integration', () => {
    // Mock database for app import
    jest.mock('../src/config/database', () => ({
        getEM: jest.fn(),
        initORM: jest.fn(),
        closeORM: jest.fn(),
        getORM: jest.fn(() => ({ em: {} })),
        ormMiddleware: (req, res, next) => next()
    }));

    it('should have base health check route', async () => {
        const app = require('../src/app');

        const res = await request(app).get('/');

        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('API is running');
    });
});
