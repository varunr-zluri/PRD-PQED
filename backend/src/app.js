const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const config = require('./config/env');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
