const Medications = require("../models/Medications");

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

        const medicationData = {
            user: req.user._id,
            name,
            type,
            dosage,
            frequency,
            schedule: schedule || [],
            startDate,
            endDate,
            inventory,
            instructions,
            doctor,
            notes
        };

        const medication = await Medications.create(medicationData);

        return res.status(201).json({ success: true, data: medication });
    } catch (err) {
        console.error("Create medication error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    GET /api/medications        private access
const getMyMedications = async (req, res) => {
    try {
        const medications = await Medications.find({ user: req.user._id, isActive: true });

        return res.status(200).json({
            success: true,
            count: medications.length,
            data: medications
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

        const updatedMedication = await Medications.findByIdAndUpdate(
            medicationId,
            { $set: req.body },
            { returnDocument: "after", runValidators: true }
        );

        return res.status(200).json({ success: true, data: updatedMedication });
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