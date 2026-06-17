const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');

const { registerUser, loginUser, changePassword } = require('../controllers/authController');

// Route    POST /api/auth/register
router.post('/register', registerUser);

// Route    POST /api/auth/login
router.post('/login', loginUser);

// Route    PUT /api/auth/changePassword
router.put('/changePassword', protect, changePassword);

module.exports = router;