const Notification = require('../models/Notification');

// Route    GET /api/notifications
const getAllNotifications = async (req, res) => {
    try {
        const logs = await Notification.find({
            user: req.user._id
        });

        res.status(200).json({ success: true, data: logs });
    } catch (err) {
        console.error("Failed to fetch medications: ", err);
        res.status(500).json({ message: "Server error" });
    }
}

// Router   POST /api/notifications      private access
const createNotification = async (req, res) => {
    try {
        const { medication, title, message, scheduledFor, dateString, scheduledTime, localNotificationId } = req.body;

        if (!medication || !message || !scheduledFor || !dateString || !scheduledTime || !localNotificationId) {
            return res.status(400).json({ message: "Please provide all fields!" });
        }

        const notification = await Notification.create({
            user: req.user._id,
            medication,
            title,
            message,
            scheduledFor,
            dateString,
            scheduledTime,
            localNotificationId,
            status: 'scheduled'
        });

        res.status(201).json({ success: true, data: notification });
    } catch (err) {
        console.error("Notification creation error: ", err)
        res.status(500).json({ message: "Server error" });
    }
};

// Route PUT /api/notifications/:id     private access
const updateStatus = async (req, res) => {
    try {
        let notif = await Notification.findById(req.params.id);

        // Check if medication exists
        if (!notif) {
            return res.status(404).json({ message: "Notification not found" });
        }

        // Ensure the user owns this medication before deletion
        if (notif.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "User Not authorized" });
        }

        // Update medication
        notif = await Notification.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after', runValidators: true });

        // Return new medication data if update successful
        return res.status(200).json({ notif });
    } catch (err) {
        console.error("notification edit error: ", err);
        res.status(500).json({ message: "server error" });
    }
}

// Route    PUT /api/notifications/snooze   private access
const snoozeNotificationStatus = async (req, res) => {
    try {
        const { medicationId, scheduledTime, dateString } = req.body;

        const updateNotif = await Notification.findOneAndUpdate(
            {
                user: req.user._id,
                medication: medicationId,
                scheduledTime: scheduledTime,
                dateString: dateString,
                status: 'scheduled'
            },
            { status: 'snoozed' },
            { returnDocument: 'after', runValidators: true }
        );

        if (!updateNotif) {
            return res.status(404).json({ message: "Matching active notification not found to snooze" });
        }

        res.status(200).json({ success: true, data: updateNotif });
    } catch (err) {
        console.error("failed to update snooze status: ", err);
        res.status(500).json({ message: "Server error" });
    }
};

// Route    DELETE /api/notifications/medication/:medId     private access
const deleteNotification = async (req, res) => {
    try {
        await Notification.deleteMany({
            user: req.user._id,
            medication: req.params.medId,
            status: 'scheduled'
        });
        res.status(200).json({ success: true, message: "Medication Notification cleared" });
    } catch (err) {
        console.error("Failed to delete notification: ", err);
        res.status(500).json({ message: "Server error" });
    }
}

// Route    DELETE /api/notifications/clear-completed
const deleteCompletedNotification = async (req, res) => {
    try {
        const { medicationId, scheduledTime, dateString } = req.body;

        await Notification.deleteOne({
            user: req.user._id,
            medication: medicationId,
            scheduledTime: scheduledTime,
            dateString: dateString,
            status: 'scheduled'
        });

        res.status(200).json({ success: true, message: "Pending notification cleared form queue" });
    } catch (err) {
        console.error("Failed to clear processe notification: ", err);
        res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getAllNotifications, createNotification, updateStatus, snoozeNotificationStatus, deleteNotification, deleteCompletedNotification };