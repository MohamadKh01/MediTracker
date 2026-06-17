const express = require('express');
const router = express.Router();

const { logAdherence, getAdherenceLog } = require('../controllers/adherenceController');
const { protect } = require('../middleware/protect');

router.use(protect);

// Route GET /api/adherence/report
router.get('/report', getAdherenceLog);

// Route POST /api/adherence/log
router.post('/log', logAdherence);

module.exports = router;