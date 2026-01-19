const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const databaseRoutes = require('./databaseRoutes');
const podRoutes = require('./podRoutes');
const requestRoutes = require('./requestRoutes');

router.get('/ping', (req, res) => {
    res.json({ pong: true });
});

router.use('/auth', authRoutes);
router.use('/database-instances', databaseRoutes);
router.use('/pods', podRoutes);
router.use('/requests', requestRoutes);

module.exports = router;


