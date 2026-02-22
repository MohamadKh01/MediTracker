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
    scheduledTime: {
        type: Date,
        required: true,
    },
    takenAt: {
        type: Date,
    },
},{
    timestamps: true,
});

module.exports = mongoose.model('AdherenceLog', AdherenceLogSchema);