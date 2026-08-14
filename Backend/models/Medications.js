const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
        index: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    schedule: [{
        type: String,
        trim: true,
    }],
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
    timestamps: true,
});

MedicationSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model("Medications", MedicationSchema);