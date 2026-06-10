const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Name is required"],
        trim: true,
    },
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: [true, 'Username already taken'],
        lowercase: true,
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
    assignedPatients: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    dateOfBirth: {
        type: Date,
        default: null,
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Prefer not to say"],
        default: "Prefer not to say",
    },
    bloodType: {
        type: String,
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Not specified'],
        default: 'Not specified',
    }
}, {
    timestamps: true,
});

// dynamic age calculation
UserSchema.virtual('age').get(function () {
    if (!this.dateOfBirth) {
        return null;
    }
    const today = new Date();
    let calculatedAge = today.getFullYear() - this.dateOfBirth.getFullYear();
    const balancedMonth = today.getMonth() - this.dateOfBirth.getMonth();

    if (balancedMonth < 0 || (balancedMonth === 0 && today.getDate() < this.dateOfBirth.getDate())) {
        calculatedAge--;
    }

    return calculatedAge;
});

UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

// hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// compared entered password with hashed password
UserSchema.methods.matchPassword = async function (pass2) {
    return await bcrypt.compare(pass2, this.password);
};

module.exports = mongoose.model("User", UserSchema);