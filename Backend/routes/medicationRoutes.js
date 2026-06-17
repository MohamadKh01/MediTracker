const express = require('express');
const router = express.Router();

const { createMedication, getMyMedications, updateMedication, deleteMedication } = require('../controllers/medicationController');
const { protect } = require('../middleware/protect');

router.use(protect);

// Route GET /api/medications
router.get('/', getMyMedications);

// Route POST /api/medications
router.post('/', createMedication);

// Route PUT /api/medications/:id
router.put('/:id', updateMedication);

// Route DELETE /api/medications/id
router.delete('/:id', deleteMedication);

module.exports = router;