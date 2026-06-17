const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');
const { verifyCaregiverPatientRelationship } = require('../middleware/verifyCaregiver');
const { getPatientMedications, getPatientLogs } = require('../controllers/caregiverController');

router.use(protect);

// Route    GET /api/caregiver/patientMeds/:id
router.get('/patientsMeds/:id', verifyCaregiverPatientRelationship, getPatientMedications);

// Route    GET /api/caregiver/patientLogs/:id
router.get('/patientsLogs/:id', verifyCaregiverPatientRelationship, getPatientLogs);

module.exports = router;