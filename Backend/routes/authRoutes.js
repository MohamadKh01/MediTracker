const express = require('express');
const router = express.Router();

const { registerUser, loginUser, changePassword } = require('../controllers/authController');
const { protect } = require('../middleware/protect');

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// PUT /api/auth/changePass
router.put('/changePass', protect, changePassword);

module.exports = router;