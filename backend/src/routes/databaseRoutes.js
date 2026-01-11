const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const auth = require('../middleware/auth');

router.get('/', auth, databaseController.getResources);

module.exports = router;
