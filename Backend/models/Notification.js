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
    message: {
        type: String,
        required: true,
    },
    scheduledFor: {
        type: Date,
        required: true,
    },
    sent: {
        type: Boolean,
        default: false,
    },
},{
    timestamps: true,
});

module.exports = mongoose.model('Notification', NotificationSchema);