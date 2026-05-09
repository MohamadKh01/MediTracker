const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    medication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medication',
        required: true,
    },
    title: {
        type: String,
        default: "Pill reminder 💊",
    },
    message: {
        type: String,
        required: true,
    },
    scheduledFor: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['scheduled', 'sent', 'taken', 'missed', 'snoozed'],
        default: 'scheduled',
    },
    localNotificationId: {
        type: String,
    },
    dateString: {
        type: String,
        required: true,
    },
    scheduledTime: {
        type: String,
        required: true,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model('Notification', NotificationSchema);