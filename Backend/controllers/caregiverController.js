const Medication = require("../models/Medications");
const Logs = require('../models/AdherenceLog');

// Route    GET /api/caregiver/patientsMeds/:id     private access
const getPatientMedications = async (req, res) => {
    try {
        const { id } = req.params;

        const medications = await Medication.find({ user: id })
            .sort({ createdAt: -1 });

        return res.status(200).json({ success: true, data: medications });
    } catch (err) {
        console.error("fetch patient meds error: ", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
};

// Route    GET /api/caregiver/patientsLogs/:id     private access
const getPatientLogs = async (req, res) => {
    try {
        const { id } = req.params;

        const reports = await Logs.find({ user: id })
            .populate('medication', 'name dosage frequency startDate endDate instructions doctor notes')
            .sort({ updatedAt: -1 });

        return res.status(200).json({ success: true, data: reports });
    } catch (err) {
        console.error("Fetch patient adherence logs error: ", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = { getPatientMedications, getPatientLogs };