const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/env');

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.secret, {
        expiresIn: '24h'
    });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find user by email
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        // Check password
        const isMatch = await user.checkPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }

        // Generate token
        const token = generateToken(user);

        // Return user info and token (excluding password)
        const userResp = user.toJSON();
        delete userResp.password;

        res.send({ user: userResp, token });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        // In a stateless JWT setup, logout is client-side (clearing token).
        // If we had a token blacklist (Redis), we would add it here.
        // For now, just send success.
        res.send({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).send();
    }
};

const getMe = async (req, res) => {
    try {
        const userResp = req.user.toJSON();
        delete userResp.password;
        res.send(userResp);
    } catch (error) {
        res.status(500).send();
    }
};

const signup = async (req, res) => {
    try {
        const { email, password, name, pod_name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Create new user (default role: DEVELOPER as per plan)
        // Store pod_name if provided
        const user = await User.create({
            email,
            password,
            name,
            pod_name: pod_name || null, // Optional, but good to have if provided
            role: 'DEVELOPER'
        });

        // No token generation (redirect to login)

        // Return success message
        const userResp = user.toJSON();
        delete userResp.password;

        res.status(201).send({
            message: 'User registered successfully. Please login.',
            user: userResp
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).send({ error: error.message });
    }
};

module.exports = {
    login,
    signup,
    logout,
    getMe
};
