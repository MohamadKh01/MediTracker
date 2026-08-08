const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');

const { registerUser, loginUser, changePassword, verifyEmail, resendVerification } = require('../controllers/authController');

// Route    POST /api/auth/register
router.post('/register', registerUser);

// Route    POST /api/auth/login
router.post('/login', loginUser);

// Route    PUT /api/auth/changePassword
router.put('/changePassword', protect, changePassword);

// Route    POST /api/auth/verifyEmail
router.post('/verifyEmail', verifyEmail);

// Route    POST /api/auth/resendVerification
router.post('/resendVerification', resendVerification);

module.exports = router;