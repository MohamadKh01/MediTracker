const Medications = require("../models/Medications");

const { encryptDocumentPayload, decryptDocumentPayload } = require('../utils/encryptionService');

// Route    POST /api/medications       private access
const createMedication = async (req, res) => {
    try {
        const { name, type, dosage, frequency, schedule, startDate, endDate, inventory, instructions, doctor, notes } = req.body;

        if (!name || !type || !dosage || !frequency || !startDate) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        if (!dosage.value || !dosage.unit) {
            return res.status(400).json({ success: false, message: "Dosage must have both value and unit" });
        }

        if (!frequency.type) {
            return res.status(400).json({ success: false, message: "Frequency type is required" });
        }

        const payloadToEncrypt = {
            name,
            type,
            dosage,
            frequency,
            startDate,
            endDate,
            inventory,
            instructions,
            doctor,
            notes
        };

        const encryptedEnvelope = encryptDocumentPayload(payloadToEncrypt);

        const medication = await Medications.create({
            user: req.user._id,
            isActive: true,
            schedule: schedule || [],
            ...encryptedEnvelope
        });

        const decryptedData = {
            _id: medication._id,
            user: medication.user,
            isActive: medication.isActive,
            schedule: medication.schedule || [],
            ...decryptDocumentPayload(medication),
            createdAt: medication.createdAt,
            updatedAt: medication.updatedAt,
        }

        return res.status(201).json({ success: true, data: decryptedData });
    } catch (err) {
        console.error("Create medication error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    GET /api/medications        private access
const getMyMedications = async (req, res) => {
    try {
        const medications = await Medications.find({ user: req.user._id, isActive: true });

        const decryptedMedications = medications.map(med => {
            const medObj = med.toObject();
            return {
                _id: medObj._id,
                user: medObj.user,
                isActive: medObj.isActive,
                schedule: medObj.schedule || [],
                ...decryptDocumentPayload(medObj),
                createdAt: medObj.createdAt,
                updatedAt: medObj.updatedAt
            };
        });

        return res.status(200).json({
            success: true,
            count: decryptedMedications.length,
            data: decryptedMedications
        });
    } catch (err) {
        console.error("Get medications error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    PUT /api/medications/:id        private access
const updateMedication = async (req, res) => {
    try {
        const medicationId = req.params.id;

        // verify the existance of the med and if it belongs to the user
        const medication = await Medications.findOne({ _id: medicationId, user: req.user._id });
        if (!medication) {
            return res.status(404).json({ success: false, message: "Medication not found" });
        }

        const currentPayload = decryptDocumentPayload(medication);

        const updatedPayload = {
            name: req.body.name !== undefined ? req.body.name : currentPayload.name,
            type: req.body.type !== undefined ? req.body.type : currentPayload.type,
            dosage: req.body.dosage !== undefined ? req.body.dosage : currentPayload.dosage,
            frequency: req.body.frequency !== undefined ? req.body.frequency : currentPayload.frequency,
            startDate: req.body.startDate !== undefined ? new Date(req.body.startDate) : currentPayload.startDate,
            endDate: req.body.endDate !== undefined ? new Date(req.body.endDate) : currentPayload.endDate,
            inventory: req.body.inventory !== undefined ? req.body.inventory : currentPayload.inventory,
            instructions: req.body.instructions !== undefined ? req.body.instructions : currentPayload.instructions,
            doctor: req.body.doctor !== undefined ? req.body.doctor : currentPayload.doctor,
            notes: req.body.notes !== undefined ? req.body.notes : currentPayload.notes,
        };

        const newEncryptedEnvelope = encryptDocumentPayload(updatedPayload);
        medication.set(newEncryptedEnvelope);

        if (req.body.isActive !== undefined) {
            medication.isActive = req.body.isActive;
        }

        if (req.body.schedule !== undefined) {
            medication.schedule = req.body.schedule;
        }

        await medication.save();

        const decryptedData = {
            _id: medication._id,
            user: medication.user,
            isActive: medication.isActive,
            schedule: medication.schedule,
            ...decryptDocumentPayload(medication),
            createdAt: medication.createdAt,
            updatedAt: medication.updatedAt
        };

        return res.status(200).json({ success: true, data: decryptedData });
    } catch (err) {
        console.error("Update medication error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    DELETE /api/medications/:id     private access
const deleteMedication = async (req, res) => {
    try {
        const medicationId = req.params.id;

        const medication = await Medications.findOne({ _id: medicationId, user: req.user._id });
        if (!medication) {
            return req.status(404).json({ success: false, message: "Medication not found" });
        }

        medication.isActive = false;
        await medication.save();

        return res.status(200).json({ success: true, message: "Medication archived successfully" });
    } catch (err) {
        console.error("Delete medication error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { createMedication, getMyMedications, updateMedication, deleteMedication };