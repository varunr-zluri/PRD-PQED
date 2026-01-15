const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { validateBody, loginSchema, signupSchema } = require('../validators');

router.post('/login', validateBody(loginSchema), authController.login);
router.post('/signup', validateBody(signupSchema), authController.signup);
router.post('/logout', auth, authController.logout);
router.get('/me', auth, authController.getMe);

module.exports = router;
