const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');
// EMAIL VERIFICATION LOGIC 3/6
const { registerUser, loginUser, changePassword, /*verifyEmail, resendVerification*/ } = require('../controllers/authController');
const { resendVerificationLimiter, verifyEmailLimiter } = require('../middleware/rateLimiter');

// Route    POST /api/auth/register
router.post('/register', registerUser);

// Route    POST /api/auth/login
router.post('/login', loginUser);

// Route    PUT /api/auth/changePassword
router.put('/changePassword', protect, changePassword);

// EMAIL VERIFICATION LOGIC 4/6
// // Route    POST /api/auth/verifyEmail
// router.post('/verifyEmail', verifyEmailLimiter, verifyEmail);

// // Route    POST /api/auth/resendVerification
// router.post('/resendVerification', resendVerificationLimiter, resendVerification);

module.exports = router;