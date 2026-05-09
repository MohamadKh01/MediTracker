const express = require("express");
const router = express.Router();

const { getAllNotifications, createNotification, updateStatus, deleteNotification } = require('../controllers/notificationController');
const { protect } = require('../middleware/protect');

// all notification routes require user to be logged in
router.use(protect);

// GET /api/notifications
router.get('/', getAllNotifications);

// POST /api/notifications
router.post('/', createNotification);

// PUT /api/notifications/:id
router.put('/:id', updateStatus);

// DELETE /api/notifications/medication/:medId
router.delete('/medication/:medId', deleteNotification);

module.exports = router;