const cron = require('node-cron');

const Notification = require('../models/Notification');
const AdherenceLog = require('../models/AdherenceLog');
const { getLocalDateString } = require('../utils/dates');

const startMissedDoseCron = () => {

    const runSweep = async () => {
        console.log('⏰ Running Missed Dose Automation Sweep (with 60 min grace period)...');

        try {
            const now = new Date();

            // grace period boundary
            const graceBoundary = new Date(now.getTime() - 60 * 60 * 1000);

            // get today's local date string format matching database format
            const targetDateStr = getLocalDateString(graceBoundary);

            // format current hours and minutes to "HH:MM" 
            const targetHoursStr = String(graceBoundary.getHours()).padStart(2, '0');
            const targetMinutesStr = String(graceBoundary.getMinutes()).padStart(2, '0');
            const gracePeriodTimeStr = `${targetHoursStr}:${targetMinutesStr}`;

            console.log(`Checking queue for ignored alerts due BEFORE -> Date: ${targetDateStr} | Time: ${gracePeriodTimeStr}`);

            // find notifications that are due today or in the past and past their time slot
            const missedNotifications = await Notification.find({
                status: 'scheduled',
                $or: [
                    { dateString: { $lt: targetDateStr } },
                    { dateString: targetDateStr, scheduledTime: { $lt: gracePeriodTimeStr } }
                ]
            });

            if (missedNotifications.length === 0) {
                return console.log('✅ Sweep complete: No missed doses found.')
            }

            console.log(`⚠️ Found ${missedNotifications.length} missed doses. Moving to history logs...`);

            // loop and migrate records concurrently
            const migrationPromises = missedNotifications.map(async (notif) => {
                // log adherence as missed
                await AdherenceLog.create({
                    user: notif.user,
                    medication: notif.medication,
                    dateString: notif.dateString,
                    scheduledTime: notif.scheduledTime,
                    status: 'missed'
                });

                // delete the processed notification from active queue
                await Notification.findOneAndDelete(notif._id);
            });

            await Promise.all(migrationPromises);
            console.log('🎉 Successfully processed all missed doses.');
        } catch (err) {
            console.error('❌ Missed Dose Cron Error: ', err);
        }
    };

    runSweep();

    cron.schedule('*/15 * * * *', runSweep);
};

module.exports = { startMissedDoseCron };