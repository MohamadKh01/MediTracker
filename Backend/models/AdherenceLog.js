const mongoose = require('mongoose');

const AdherenceLogSchema = new mongoose.Schema({
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
    status: {
        type: String,
        enum: ['taken', 'missed'],
        required: true,
    },
    // storing the day "2026-04-27"
    dateString: {
        type: String,
        required: true,
    },
    // storing the time "08:00"
    scheduledTime: {
        type: String,
        required: true,
    },
    takenAt: {
        type: Date,
        default: Date.now,
    },
},{
    timestamps: true,
});

AdherenceLogSchema.index({ user: 1, dateString: 1 });

module.exports = mongoose.model('AdherenceLog', AdherenceLogSchema);