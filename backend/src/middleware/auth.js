const jwt = require('jsonwebtoken');
const config = require('../config/env');
const { getEM } = require('../config/database');
const { User } = require('../entities');

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            throw new Error();
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        const em = getEM();
        const user = await em.findOne(User, { id: decoded.id });

        if (!user) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Please authenticate.' });
    }
};

module.exports = auth;
