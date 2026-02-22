const mongoose = require('mongoose');

const caregiverLinkScema = new mongoose.Schema({
    caregiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    patient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending',
    },
},{
    timestamps: true,
});

module.exports = mongoose.model("CaregiverLink", caregiverLinkScema);