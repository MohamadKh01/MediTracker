const mongoose = require('mongoose')

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    }, 
    email: {
        type: String,
        unique: [true, "Email already exists"],
        required: [true, "Email is required"],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
    },
    role: {
        type: String,
        enum: ['patient', 'caregiver'],
        default: 'patient',
    },
    phone: {
        type: String,
    },
}, {
    timestamps: true,
});

module.exports = mongoose.model("Users", UserSchema);