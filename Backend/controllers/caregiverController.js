const Medication = require("../models/Medications");
const Logs = require('../models/AdherenceLog');

const { decryptDocumentPayload } = require('../utils/encryptionService');

// Route    GET /api/caregiver/patientsMeds/:id     private access
const getPatientMedications = async (req, res) => {
    try {
        const { id } = req.params;

        const medications = await Medication.find({ user: id })
            .sort({ createdAt: -1 });

        const decryptedMedications = medications.map(med => {
            const medObj = med.toObject();
            return {
                _id: medObj._id,
                user: medObj.user,
                isActive: medObj.isActive,
                ...decryptDocumentPayload(medObj),
                createdAt: medObj.createdAt,
                updatedAt: medObj.updatedAt
            };
        });

        return res.status(200).json({ success: true, data: decryptedMedications });
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
            .populate('medication')
            .sort({ updatedAt: -1 });

        const decryptedReports = reports.map(log => {
            const logObj = log.toObject();
            const decryptedLogPayload = decryptDocumentPayload(logObj);

            let decryptedMedication = logObj.medication;
            if (logObj.medication && logObj.medication.encryptedPayload) {
                decryptedMedication = {
                    _id: logObj.medication._id,
                    user: logObj.medication.user,
                    isActive: logObj.medication.isActive,
                    ...decryptDocumentPayload(logObj.medication),
                    createdAt: logObj.medication.createdAt,
                    updatedAt: logObj.medication.updatedAt
                };
            }

            return {
                _id: logObj._id,
                user: logObj.user,
                medication: decryptedMedication,
                scheduledTime: logObj.scheduledTime,
                logDate: logObj.logDate,
                ...decryptedLogPayload,
                createdAt: logObj.createdAt,
                updatedAt: logObj.updatedAt
            };
        });

        return res.status(200).json({ success: true, data: decryptedReports });
    } catch (err) {
        console.error("Fetch patient adherence logs error: ", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = { getPatientMedications, getPatientLogs };