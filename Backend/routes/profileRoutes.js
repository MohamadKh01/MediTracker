const express = require('express');
const router = express.Router();

const { getUserProfile, updateUserProfile } = require("../controllers/profileController");
const { protect } = require('../middleware/protect');

router.use(protect);

// GET  /api/users/profile
router.get('/profile', protect, getUserProfile);

// PUT  /api/users/profile
router.put('/profile', updateUserProfile);

module.exports = router;