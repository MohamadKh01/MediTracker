const Medications = require('../models/Medications');
const AdherenceLog = require('../models/AdherenceLog');
const Links = require('../models/CaregiverLink');
const Users = require('../models/Users');

const { sendPushNotification } = require('../utils/notifications');
const { encryptDocumentPayload, decryptDocumentPayload } = require('../utils/encryptionService');

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

        // decrypt medication info to use its name in notification
        const decryptedMed = decryptDocumentPayload(medExists);

        // encrypt sensitive payload for the adherence log
        const payloadToEncrypt = { status, notes, takenAt: status === 'taken' ? new Date() : null };
        const encryptedEnvelope = encryptDocumentPayload(payloadToEncrypt);

        // update if it exists or create new
        const log = await AdherenceLog.findOneAndUpdate(
            { medication, logDate: new Date(logDate), scheduledTime },
            {
                user: req.user._id,
                ...encryptedEnvelope
            },
            { returnDocument: "after", runValidators: true, upsert: true }
        );

        // deduct a unit if taken and tracking is active
        if (status === 'taken' && decryptedMed.inventory?.trackingEnabled) {
            if (decryptedMed.inventory.currentQuantity > 0) {
                decryptedMed.inventory.currentQuantity -= 1;
                // re-encrypt updated medication document payload
                const updatedMedEnvelope = encryptDocumentPayload(decryptedMed);
                medExists.set(updatedMedEnvelope);
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
                const decryptedUser = req.user.encryptedPayload ? decryptDocumentPayload(req.user) : req.user;
                const patientName = decryptedUser.name || decryptedUser.username;

                let messageTitle = "";
                let messageBody = "";
                const dataPayload = { screen: 'PatientLogs', id: req.user._id.toString() };

                if (status === 'skipped') {
                    messageTitle = `⚠️ Medication Skipped: ${patientName}`;
                    messageBody = `${patientName} skipped their dose for "${decryptedMed.name}" scheduled at ${scheduledTime}.`;
                } else if (status === 'taken') {
                    messageTitle = `✅ Medication taken: ${patientName}`;
                    messageBody = `${patientName} successfully took their scheduled dose for "${decryptedMed.name}" at ${scheduledTime}.`;
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

        // return formatted response containing decrypted log data
        const decryptedLogData = {
            _id: log._id,
            user: log.user,
            medication: log.medication,
            scheduledTime: log.scheduledTime,
            logDate: log.logDate,
            ...decryptDocumentPayload(log),
            createdAt: log.createdAt,
            updatedAt: log.updatedAt
        }

        return res.status(200).json({ success: true, data: decryptedLogData });
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
            .populate('medication')
            .sort({ logDate: -1 });

        // decrypt payloads for both the log and its populated medication
        const decryptedLogs = logs.map(log => {
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

        return res.status(200).json({ success: true, count: decryptedLogs.length, data: decryptedLogs });
    } catch (err) {
        console.error("Get report error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { getAdherenceLog, logAdherence };