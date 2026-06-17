const Medications = require('../models/Medications');
const AdherenceLog = require('../models/AdherenceLog');
const Links = require('../models/CaregiverLink');
const Users = require('../models/Users');

const { sendPushNotification } = require('../utils/notifications');

// Route    POST /api/medications/log       private access
const logAdherence = async (req, res) => {
    try {
        const { medication, scheduledTime, logDate, status, notes } = req.body;

        if (!medication || !scheduledTime || !logDate || !status) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const medExists = await Medications.findOne({ _id: medication, user: req.user._id });
        if (!medExists) {
            return res.status(404).json({ success: false, message: "Medication not found" });
        }

        // update if it exists or create new
        const log = await AdherenceLog.findOneAndUpdate(
            { medication, logDate: new Date(logDate), scheduledTime },
            {
                user: req.user._id,
                status,
                notes,
                takenAt: status === 'taken' ? new Date() : null
            },
            { returnDocument: "after", runValidators: true, upsert: true }
        );

        // deduct a unit if taken and tracking is active
        if (status === 'taken' && medExists.inventory?.trackingEnabled) {
            if (medExists.inventory.currentQuantity > 0) {
                medExists.inventory.currentQuantity -= 1;
                await medExists.save();
            }
        }

        const activeLinks = await Links.find({
            patient: req.user._id,
            status: 'approved'
        });

        if (activeLinks.length > 0) {
            const caregiverIds = activeLinks.map(link => link.caregiver);

            const caregivers = await Users.find({
                _id: { $in: caregiverIds },
                expoPushToken: { $ne: null }
            });

            if (caregivers.length > 0) {
                const patientName = req.user.name || req.user.username;
                let messageTitle = "";
                let messageBody = "";
                const dataPayload = { screen: 'PatientLogs', id: req.user._id.toString() };

                if (status === 'skipped') {
                    messageTitle = `⚠️ Medication Skipped: ${patientName}`;
                    messageBody = `${patientName} skipped their dose for "${medExists.name}" scheduled at ${scheduledTime}.`;
                } else if (status === 'taken') {
                    messageTitle = `✅ Medication taken: ${patientName}`;
                    messageBody = `${patientName} successfullt took their scheduled dose for "${medExists.name}" at ${scheduledTime}.`;
                }

                if (messageTitle && messageBody) {
                    await Promise.all(
                        caregivers.map(caregiver =>
                            sendPushNotification(
                                caregiver.expoPushToken,
                                messageTitle,
                                messageBody,
                                dataPayload
                            )
                        )
                    );
                }
            }
        }

        return res.status(200).json({ success: true, data: log });
    } catch (err) {
        console.error("Log adherence error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    GET /api/medications/report     private access
const getAdherenceLog = async (req, res) => {
    try {

        const query = { user: req.user._id };

        const logs = await AdherenceLog.find(query)
            .populate('medication', 'name dosage frequency startDate endDate instructions doctor notes')
            .sort({ logDate: -1 });

        return res.status(200).json({ success: true, count: logs.length, data: logs });
    } catch (err) {
        console.error("Get report error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { getAdherenceLog, logAdherence };