const express = require('express');
const router = express.Router();

const { addMedication, getAllMedications, deleteMedication, editMedication } = require("../controllers/medicationsController");
const { protect } = require("../middleware/protect");

// All med routes should be protected
router.use(protect);

// POST /api/medications/
router.post('/', addMedication);

// GET /api/medications/
router.get("/", getAllMedications);

// DELETE /api/medications/:id
router.delete("/:id", deleteMedication);

// PUT /api/medication/:id
router.put("/:id", editMedication);

module.exports = router;