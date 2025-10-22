const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');
const { validateRegister, validateLogin, validateProfile } = require('../middleware/validation');

// Public routes (no authentication required)
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerificationEmail);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Protected routes (authentication required)
router.get('/me', auth, authController.getCurrentUser);
router.put('/update-profile', auth, validateProfile, authController.updateProfile);
router.post('/change-password', auth, authController.changePassword);

module.exports = router;