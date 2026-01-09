const express = require('express');
const router = express.Router();
const podController = require('../controllers/podController');
const auth = require('../middleware/auth');

router.get('/', auth, podController.getPods);

module.exports = router;
