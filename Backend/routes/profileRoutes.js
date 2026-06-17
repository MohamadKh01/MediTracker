const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');
const { getUserProfile, updateUserProfile } = require('../controllers/profileController');

router.use(protect);

// Route    GET /api/users/profile
router.get('/profile', getUserProfile);

//Route     PUT /api/users/updateProfile
router.put('/updateProfile', updateUserProfile);

module.exports = router;