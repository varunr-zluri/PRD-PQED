const jwt = require('jsonwebtoken');
const { User } = require('../entities');
const { getEM } = require('../config/database');
const config = require('../config/env');

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.secret, {
        expiresIn: '24h'
    });
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const em = getEM();

        // Find user by email
        const user = await em.findOne(User, { email });
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
        delete userResp.createdAt;
        delete userResp.updatedAt;
        delete userResp.created_at;
        delete userResp.updated_at;

        res.send({ user: userResp, token });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        // In a stateless JWT setup, logout is client-side (clearing token).
        // For now, just sending success.
        res.send({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).send();
    }
};

const getMe = async (req, res) => {
    try {
        const userResp = req.user.toJSON();
        delete userResp.createdAt;
        delete userResp.updatedAt;
        delete userResp.created_at;
        delete userResp.updated_at;
        res.send(userResp);
    } catch (error) {
        res.status(500).send();
    }
};

const signup = async (req, res) => {
    try {
        const { email, password, name, pod_name } = req.body;
        const em = getEM();

        // Check if user already exists
        const existingUser = await em.findOne(User, { email });
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists, try logging in' });
        }

        // Create new user (default role: DEVELOPER)
        const user = em.create(User, {
            email,
            password,
            name,
            pod_name: pod_name || null,
            role: 'DEVELOPER'
        });

        await em.persistAndFlush(user);

        // Return success message and user info (excluding password and timestamps)
        const userResp = user.toJSON();
        delete userResp.createdAt;
        delete userResp.updatedAt;
        delete userResp.created_at;
        delete userResp.updated_at;

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
