const express = require('express');
const router = express.Router();
const databaseController = require('../controllers/databaseController');
const auth = require('../middleware/auth');

router.get('/', auth, databaseController.getInstances);
router.get('/:id', auth, databaseController.getInstance);
router.get('/:id/databases', auth, databaseController.getDatabases);

module.exports = router;
