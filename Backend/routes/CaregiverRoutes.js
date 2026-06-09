const express = require("express");
const router = express.Router();

const { getCaregiverDashboard, linkPatientByEmail, getPatientDetailedInspection } = require("../controllers/caregiverController");
const { protect } = require("../middleware/protect");

// middleware to "only caregiver can access these routes"
const requireCaregiver = (req, res, next) => {
    if (!req.user || req.user.role !== "caregiver") {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
};

router.use(protect);
router.use(requireCaregiver);

// GET  /api/caregiver/dashboard
router.get('/dashboard', getCaregiverDashboard);

// GER  /api/caregiver/patient/:id
router.get('/patient/:id', getPatientDetailedInspection);

// POST /api/caregiver/link
router.post('/link', linkPatientByEmail);

module.exports = router;