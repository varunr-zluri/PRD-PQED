const jwt = require('jsonwebtoken');
const { User } = require('../entities');
const { getEM } = require('../config/database');
const config = require('../config/env');

const generateToken = (user) => {
    return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwt.secret, {
        expiresIn: '12h'
    });
};

const login = async (req, res) => {
    try {
        const { email, username, password } = req.body;
        const em = getEM();

        // Find user by email OR username
        let user;
        if (email) {
            user = await em.findOne(User, { email });
        } else if (username) {
            user = await em.findOne(User, { username });
        } else {
            return res.status(400).json({ error: 'Email or username required' });
        }

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

        res.send({ user: user.toJSON(), token });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
};

const logout = async (req, res) => {
    try {
        res.send({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).send();
    }
};

const getMe = async (req, res) => {
    try {
        res.send(req.user.toJSON());
    } catch (error) {
        res.status(500).send();
    }
};

const signup = async (req, res) => {
    try {
        const { email, username, password, name, pod_name } = req.body;
        const em = getEM();

        // Check if email already exists
        const existingEmail = await em.findOne(User, { email });
        if (existingEmail) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }

        // Check if username already exists (if provided)
        if (username) {
            const existingUsername = await em.findOne(User, { username });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username already taken' });
            }
        }

        // Create new user
        const user = em.create(User, {
            email,
            username: username || null,
            password,
            name,
            pod_name: pod_name || null,
            role: 'DEVELOPER'
        });

        await em.persistAndFlush(user);

        res.status(201).send({
            message: 'User registered successfully. Please login.',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(400).send({ error: error.message });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { username, password, name } = req.body;
        const em = getEM();
        const user = req.user;

        // Check if username is being changed and if it's already taken
        if (username && username !== user.username) {
            const existingUsername = await em.findOne(User, { username });
            if (existingUsername) {
                return res.status(400).json({ error: 'Username already taken' });
            }
            user.username = username;
        }

        // Update password if provided
        if (password) {
            user.password = password; // Will be hashed by beforeUpdate hook
        }

        // Update name if provided
        if (name) {
            user.name = name;
        }

        await em.flush();

        res.send({
            message: 'Profile updated successfully',
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(400).send({ error: error.message });
    }
};

module.exports = {
    login,
    signup,
    logout,
    getMe,
    updateProfile
};

