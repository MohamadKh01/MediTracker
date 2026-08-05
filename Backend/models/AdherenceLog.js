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
    encryptedPayload: {
        type: String,
        required: [true, "Encrypted payload is required"],
    },
    payloadIV: {
        type: String,
        required: [true, "Payload IV is required"],
    },
    payloadTag: {
        type: String,
        required: [true, "Payload auth tag is required"],
    },
    payloadDek: {
        type: String,
        required: [true, "Payload DEK is required"],
    },
    payloadDekIv: {
        type: String,
        required: [true, "DEK IV is required"],
    },
    payloadDekTag: {
        type: String,
        required: [true, "DEK auth tag is required"],
    },
}, {
    timestamps: true
});

AdherenceLogSchema.index({ medication: 1, logDate: 1, scheduledTime: 1 }, { unique: true });

module.exports = mongoose.model('AdherenceLog', AdherenceLogSchema);