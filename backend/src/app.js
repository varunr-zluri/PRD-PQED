const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const routes = require('./routes');
const config = require('./config/env');
const { ormMiddleware } = require('./config/database');

const app = express();

// Rate Limiters
const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 200, // Limit each IP to 200 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 10, // Limit each IP to 10 login/signup attempts per hour
    message: { error: 'Too many login attempts, please try again later.' }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply global rate limiter
app.use('/api', globalLimiter);
// Apply stricter limiter to auth routes specifically
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);

// MikroORM request context middleware
// Note: Middleware only works after ORM is initialized in server.js
app.use((req, res, next) => {
    try {
        ormMiddleware(req, res, next);
    } catch (e) {
        // ORM not initialized yet (e.g., during tests)
        next();
    }
});

// Routes
app.use('/api', routes);

// Base route for health check
app.get('/', (req, res) => {
    res.json({ message: 'Database Query Portal API is running', env: config.env });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: err.message || 'Internal Server Error'
    });
});

module.exports = app;
