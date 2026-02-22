const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
    },
    dosage: {
        type: String,
    },
    frequency: {
        type: Number,
        required: [true, 'Frequency is required'],
    },
    times: [{
        type: String,
    },],
    startDate: {
        type: Date,
        required: [true, 'Start Date is required'],
    },
    endDate: {
        type: Date,        
    },
    notes: {
        type: String,
    },
},{
        timestamps: true,
});

module.exports = mongoose.model("Medication", MedicationSchema);