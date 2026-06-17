const mongoose = require('mongoose');

const MedicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
        index: true,
    },
    name: {
        type: String,
        required: [true, 'Medication name is required'],
        trim: true,
    },
    type: {
        type: String,
        enum: ['tablet', 'capsule', 'liquid', 'injection', 'inhaler', 'cream', 'other'],
        required: [true, 'Medication type is required'],
        default: 'other',
    },
    dosage: {
        value: {
            type: Number, // example: 500
            required: true,
        },
        unit: {
            type: String, // example: 'mg'
            enum: ['mg', 'mcg', 'ml', 'drops', 'puffs', 'units'],
            required: true,
        },
    },
    frequency: {
        type: {
            type: String,
            enum: ['daily', 'specific days', 'as needed (PRN)', 'interval'],
            required: true,
        },
        specificDays: {
            type: [String],
            enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        intervalDays: {
            type: Number, // example every 3 days
        },
    },
    schedule: [{
        time: { // example: "16:00"
            type: String,
            required: true,
        },
        reminderId: { // to sync with push notification services
            type: String,
        },
    }],
    startDate: {
        type: Date,
        required: [true, 'Start date is required'],
    },
    endDate: {
        type: Date,
    },
    inventory: {
        trackingEnabled: {
            type: Boolean,
            default: false,
        },
        currentQuantity: {
            type: Number,
            default: 0
        },
        refillThreshold: {
            type: Number,
            default: 5,
        },
        lastRefilledDate: {
            type: Date,
        },
    },
    instructions: {
        type: String,
        enum: ['before food', 'with food', 'after food', 'empty stomach', 'no preference'],
        default: 'no preference',
    },
    doctor: {
        name: {
            type: String,
            trim: true,
        },
        phone: {
            type: String,
        },
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    notes: {
        type: String,
        trim: true,
    },
}, {
    timestamps: true,
});

MedicationSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model("Medications", MedicationSchema);