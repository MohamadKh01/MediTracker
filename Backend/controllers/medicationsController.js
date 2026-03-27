const Medication = require("../models/Medication");

// route    POST /api/medications   private access
const addMedication = async (req, res) => {
    try {
        const { name, dosage, frequency, times, startDate, endDate, notes } = req.body;

        // Validate required fields
        if (!name || !dosage || !frequency || !times || !startDate) {
            return res.status(400).json({ message: 'Please provide Medication name, dosage, frequency, times and start date' });
        }

        // create a new medication
        const med = await Medication.create({ user: req.user._id, name, dosage, frequency, times, startDate, endDate, notes });

        // Return medication data if successfully created
        return res.status(201).json({
            _id: med._id,
            user: med.user,
            name: med.name,
            dosage: med.dosage,
            frequency: med.frequency,
            times: med.times,
            startDate: med.startDate,
            endDate: med.endDate,
            notes: med.notes,
        });
    } catch (err) {
        console.error("Med creation error: ", err);
        return res.status(500).json({ message: "server error" });
    }
}

// route    GET /api/medications    private access
const getAllMedications = async (req, res) => {
    try {
        // find all medications of this user
        const meds = await Medication.find({ user: req.user._id }).sort({ createdAt: -1 });

        return res.status(200).json(meds);
    } catch (err) {
        console.error("Med fetching error: ", err);
        return res.status(500).json({ message: "server error" });
    }
}

// route DELETE /api/medications    private access
const deleteMedication = async (req, res) => {
    try {
        const med = await Medication.findById(req.params.id);

        // Check if medication exists
        if (!med) {
            return res.status(404).json({ message: "Medication not found" });
        }

        // Ensure the user owns this medication before deletion
        if (med.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User Not authorized" });
        }

        // Delete medication
        await med.deleteOne();
        return res.status(200).json({ message: "Medication removed" });
    } catch (err) {
        console.error("Med deletion error: ", err);
        return res.status(500).json({ message: "server error" });
    }
}

const editMedication = async (req, res) => {
    try {
        let med = await Medication.findById(req.params.id);

        // Check if medication exists
        if (!med) {
            return res.status(404).json({ message: "Medication not found" });
        }

        // Ensure the user owns this medication before deletion
        if (med.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User Not authorized" });
        }

        // Update medication
        med = await Medication.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });

        // Return new medication data if update successful
        return res.status(200).json({ med });
    } catch (err) {
        console.error("Med edit error: ", err);
        res.status(500).json({ message: "server error" });
    }
}

module.exports = { addMedication, getAllMedications, deleteMedication, editMedication };