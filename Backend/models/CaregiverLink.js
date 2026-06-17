const mongoose = require('mongoose');

const CaregiverLinkSchema = new mongoose.Schema({
    caregiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'revoked'],
        default: 'pending',
    },
    initiatedBy: {
        type: String,
        enum: ['caregiver', 'patient'],
        required: [true, "Must log who initiated this link request"]
    }
}, {
    timestamps: true,
});

CaregiverLinkSchema.index({ caregiver: 1, patient: 1 }, { unique: true });

module.exports = mongoose.model("CaregiverLink", CaregiverLinkSchema);