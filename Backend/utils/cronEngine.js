const cron = require('node-cron');

const Medications = require('../models/Medications');
const AdherenceLog = require('../models/AdherenceLog');
const Links = require('../models/CaregiverLink');
const Users = require('../models/Users');

const { sendPushNotification } = require('./notifications');

const getSystemTimeMetrics = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const pastHours = String(thirtyMinsAgo.getHours()).padStart(2, '0');
    const pastMinutes = String(thirtyMinsAgo.getMinutes()).padStart(2, '0');

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return {
        nowTime: `${hours}:${minutes}`,
        pastTime: `${pastHours}:${pastMinutes}`,
        todayStr: `${year}-${month}-${day}`,
        weekdayName: now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    };
};

const startNotificationCronEngine = () => {
    // cron wakes up once every minute (* * * * *)
    cron.schedule('* * * * *', async () => {
        try {
            const { nowTime, pastTime, todayStr, weekdayName } = getSystemTimeMetrics();
            const todayDateObj = new Date(todayStr);

            console.log(`[CRON RUNNER] server time: ${todayDateObj} | checking for meds at: ${todayStr}`);

            // remind patients when dose is due
            const dueMedications = await Medications.find({
                isActive: true,
                startDate: { $lte: todayDateObj },
                $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: todayDateObj } }],
                'schedule.time': nowTime
            }).populate('user');

            for (let med of dueMedications) {
                let isScheduledToday = false;

                if (med.frequency.type === "daily" || med.frequency.type === 'as needed (PRN)') {
                    isScheduledToday = true;
                } else if (med.frequency.type === "specific days" && med.frequency.specificDays?.includes(weekdayName)) {
                    isScheduledToday = true;
                } else if (med.frequency.type === "interval" && med.frequency.intervalDays) {
                    const diffTime = Math.abs(todayDateObj.getTime() - new Date(med.startDate).getTime());
                    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
                    if (diffDays % med.frequency.intervalDays === 0) {
                        isScheduledToday = true;
                    }
                }

                if (isScheduledToday && med.user?.expoPushToken) {
                    await sendPushNotification(
                        med.user.expoPushToken,
                        "⏰ Medication Reminder",
                        `It's time to take your medication: ${med.name} (${med.dosage.value} ${med.dosage.unit}).`
                    );
                }
            }

            // auto detect and log missed doses (30 min later)
            const pastMedications = await Medications.find({
                isActive: true,
                startDate: { $lte: todayDateObj },
                $or: [{ endDate: { $exists: false } }, { endDate: null }, { endDate: { $gte: todayDateObj } }],
                'schedule.time': pastTime
            }).populate('user');

            for (let med of pastMedications) {
                let wasScheduledPastWindow = false;

                if (med.frequency.type === "daily") {
                    wasScheduledPastWindow = true;
                } else if (med.frequency.type === "specific days" && med.frequency.specificDays?.includes(weekdayName)) {
                    wasScheduledPastWindow = true;
                } else if (med.frequency.type === "interval" && med.frequency.intervalDays) {
                    const diffTime = Math.abs(todayDateObj.getTime() - new Date(med.startDate).getTime());
                    const diffDays = Math.round(diffTime / (24 * 60 * 60 * 1000));
                    if (diffDays % med.frequency.intervalDays === 0) {
                        wasScheduledPastWindow = true;
                    }
                }

                if (wasScheduledPastWindow) {
                    // check if patient logged this medication as taken or skipped
                    const existingLog = await AdherenceLog.findOne({
                        medication: med._id,
                        logDate: todayDateObj,
                        scheduledTime: pastTime
                    });

                    // if not logged, after 30 min, log it as missed
                    if (!existingLog) {
                        await AdherenceLog.create({
                            user: med.user._id,
                            medication: med._id,
                            scheduledTime: pastTime,
                            logDate: todayDateObj,
                            status: 'missed',
                            notes: "Auto detected missed dose"
                        });

                        // send notification to the patient
                        if (med.user?.expoPushToken) {
                            await sendPushNotification(
                                med.user.expoPushToken,
                                "❌ Medication Missed",
                                `You missed your scheduled dose window for "${med.name}" at ${pastTime}.`
                            );
                        }

                        // fetch and alert caregivers
                        const activeLinks = await Links.find({ patient: med.user._id, status: 'approved' });
                        if (activeLinks.length > 0) {
                            const caregiverId = activeLinks.map(link => link.caregiver);
                            const caregivers = await Users.find({
                                _id: { $in: caregiverId },
                                expoPushToken: { $ne: null }
                            });

                            if (caregivers.length > 0) {
                                const patientName = med.user.name || med.user.username;
                                await Promise.all(
                                    caregivers.map(caregiver =>
                                        sendPushNotification(
                                            caregiver.expoPushToken,
                                            `🚨 Missed Dose Alert: ${patientName}`,
                                            `${patientName} missed their scheduled dose for "${med.name}" at ${pastTime}`,
                                            { screen: 'PatientLogs', id: med.user._id.toString() }
                                        )
                                    )
                                );
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Cron automation error: ", err);
        }
    });
}

module.exports = { startNotificationCronEngine };