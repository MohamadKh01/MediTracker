const express = require("express");
const router = express.Router();

const { logDose, getLogsByDate } = require('../controllers/adherenceController');
const { protect } = require('../middleware//protect');

// all adherence routes require user to be logged in
router.use(protect);

// POST /api/adherence
router.post('/', logDose);

// GET /api/adherence/:dateString
router.get('/:dateString', getLogsByDate);

module.exports = router;