const User = require('../models/User');
const Medication = require('../models/Medication');
const AdherenceLog = require('../models/AdherenceLog');

// Route    GET /api/caregiver/dashboard
const getCaregiverDashboard = async (req, res) => {
    try {
        const caregiver = await User.findById(req.user._id).populate("assignedPatients", "name email phone role");

        if (!caregiver) {
            return res.status(404).json({ success: false, message: "Caregiver not found" });
        }

        // fetch meds assigned to linked patients
        const patientIds = caregiver.assignedPatients.map(patient => patient._id);
        const medications = await Medication.find({ user: { $in: patientIds } });

        const todayStr = new Date().toISOString().split('T')[0].replace(/-/g, "/");

        const todayLogs = await AdherenceLog.find({
            user: { $in: patientIds },
            dateString: todayStr
        });

        // make a clean summary card for each patient
        const patientDataFeed = caregiver.assignedPatients.map(patient => {
            //get data of this user
            const patientMeds = medications.filter(m => m.user.toString() === patient._id.toString());
            const patientLogs = todayLogs.filter(l => l.user.toString() === patient._id.toString());

            const takenCount = patientLogs.filter(l => l.status === "taken").length;
            const missedCount = patientLogs.filter(l => l.status === "missed").length;

            const pendingCount = Math.max(0, patientMeds.length - (takenCount + missedCount));

            return {
                _id: patient._id,
                name: patient.name,
                email: patient.email,
                role: patient.role,
                phone: patient.phone || "Not provided",
                medicationsCount: patientMeds.length,
                todaySummary: {
                    taken: takenCount,
                    missed: missedCount,
                    pending: pendingCount
                }
            };
        });

        return res.status(200).json({ success: true, data: patientDataFeed });
    } catch (err) {
        console.error("Caregiver dashboard fetching error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Route    GET /api/caregiver/patient/:id
const getPatientDetailedInspection = async (req, res) => {
    try{
        const { id } = req.params;

        // make sure this patient is linked to this caregiver
        const caregiver = await User.findById(req.user._id);
        const isLinked = caregiver.assignedPatients.some(patientId => patientId.toString() === id);

        if(!isLinked) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        const patient = await User.findById(id).select("name email phone");
        if(!patient) {
            return res.status(404).json({ success: false, message: "patient not found"});
        }

        // fetch medications and logs
        const meds = await Medication.find({ user: id }).select("name dosage frequency active");
        const logs = await AdherenceLog.find({ user: id})
            .sort({ createdAt: -1 })
            .select("medicationName takenAt status dateString timeString");

        return res.status(200).json({
            success: true,
            data: {
                profile: patient,
                medications: meds,
                logs: logs
            }
        });
    } catch (err) {
        console.error("Patient inspection query compilation failure: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Route    POST /api/caregiver/link
const linkPatientByEmail = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email || !email.trim()) {
            return res.status(400).json({ success: false, message: "Please provide a valid patient email address" });
        }

        const targetPatient = await User.findOne({ email: email.trim().toLowerCase() });

        if (!targetPatient) {
            return res.status(404).json({ success: false, message: "No patient linked to this email" });
        }

        // prevent linking another caregiver
        if (targetPatient.role != "patient") {
            return res.status(400).json({ success: false, message: "this user is not a patient!" });
        }

        // prevent duplicate linking
        const caregiver = await User.findById(req.user._id);
        const alreadyLinked = caregiver.assignedPatients.some(id => id.toString() === targetPatient._id.toString());
        if (alreadyLinked) {
            return res.status(400).json({ success: false, message: "this patient is already linked" });
        }

        // add patient to assigned patients list
        caregiver.assignedPatients.push(targetPatient._id);
        await caregiver.save();

        return res.status(200).json({ success: true, message: `successfully linked ${targetPatient.name}` });
    } catch (err) {
        console.error("caregiver patient link error: ", err);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

module.exports = { getCaregiverDashboard, linkPatientByEmail, getPatientDetailedInspection };