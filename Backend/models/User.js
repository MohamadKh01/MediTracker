const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
    assignedPatients: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
}, {
    timestamps: true,
});

// hash password before saving
UserSchema.pre('save', async function () {
    if(!this.isModified('password')){
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