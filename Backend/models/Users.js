const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        unique: [true, "Username already taken"],
        lowercase: true,
        trim: true,
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: [true, "Email already exists"],
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: [true, "Password is required"],
    },
    role: {
        type: String,
        enum: ['patient', 'caregiver'],
        default: 'patient',
    },
    expoPushToken: {
        type: String,
        default: null
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
    timestamps: true,
});

// hash password before saving
UserSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// compare entered password with hashed password
UserSchema.methods.matchPassword = async function (pass2) {
    return await bcrypt.compare(pass2, this.password);
}

module.exports = mongoose.model("Users", UserSchema);