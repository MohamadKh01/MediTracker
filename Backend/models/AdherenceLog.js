const mongoose = require('mongoose');

const AdherenceLogSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
        index: true,
    },
    medication: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Medications',
        required: true,
        index: true,
    },
    scheduledTime: {
        type: String,
        required: true,
    },
    logDate: {
        type: Date,
        required: true,
    },
    status: {
        type: String,
        enum: ['taken', 'skipped', 'missed'],
        required: [true, 'status is required'],
    },
    takenAt: {
        type: Date,
    },
    notes: {
        type: String,
        trim: true,
    }
}, {
    timestamps: true
});

AdherenceLogSchema.index({ medication: 1, logDate: 1, scheduledTime: 1 }, { unique: true });

module.exports = mongoose.model('AdherenceLog', AdherenceLogSchema);