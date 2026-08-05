const Users = require('../models/Users');
const generateToken = require('../utils/generateToken');

const { encryptDocumentPayload, decryptDocumentPayload } = require('../utils/encryptionService');

// helper function to calculate age dynamically from DOB
const calculateAge = (dob) => {
    if (!dob) {
        return null;
    }

    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const balancedMonth = today.getMonth() - birthDate.getMonth();
    if (balancedMonth < 0 || (balancedMonth === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
    }
    return calculatedAge;
}

// Route    GET /api/users/profile      private access
const getUserProfile = async (req, res) => {
    try {
        const user = await Users.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const decryptedProfile = decryptDocumentPayload(user);

        return res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                expoPushToken: user.expoPushToken,
                ...decryptedProfile,
                age: calculateAge(decryptedProfile.dateOfBirth),
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error("Profile fetching err: ", err);
        return res.status(500).json({ message: "Server error" });
    }
}

// Route    PUT /api/users/updateProfile    private access
const updateUserProfile = async (req, res) => {
    try {
        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // prevent updating password through this route
        // findByIdAndUpdate will bypass the pre-save method for hashing password before saving
        if (req.body.password) {
            return res.status(400).json({ success: false, message: "Cannot update password through this endPoint" });
        }

        // check if new username is unique
        if (req.body.username) {
            const cleanUsername = user.username.trim().toLowerCase();
            if (cleanUsername !== user.username) {
                const usernameExists = await Users.findOne({ username: cleanUsername });
                if (usernameExists) {
                    return res.status(400).json({ success: false, message: "Username already taken" });
                }
                req.body.username = cleanUsername;
            }
        }

        // update plaintext fields if provided
        if (req.body.expoPushToken !== undefined) {
            user.expoPushToken = req.body.expoPushToken;
        }

        if (req.body.username !== undefined) {
            user.username = req.body.username;
        }

        const currentProfile = decryptDocumentPayload(user);

        // prevent injection attacks (for example cannot inject role change)
        const updatedProfilePayload = {
            name: req.body.name !== undefined ? req.body.name : currentProfile.name,
            phone: req.body.phone !== undefined ? req.body.phone : currentProfile.phone,
            dateOfBirth: req.body.dateOfBirth !== undefined ? (req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null) : currentProfile.dateOfBirth,
            gender: req.body.gender !== undefined ? req.body.gender : currentProfile.gender,
            bloodType: req.body.bloodType !== undefined ? req.body.bloodType : currentProfile.bloodType,
        };

        const newEncryptedEnvelope = encryptDocumentPayload(updatedProfilePayload);
        user.set(newEncryptedEnvelope);

        await user.save();

        const finalDecryptedProfile = decryptDocumentPayload(user);

        return res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                expoPushToken: user.expoPushToken,
                ...finalDecryptedProfile,
                age: calculatedAge(finalDecryptedProfile.dateOfBirth),
                createdAt: user.createdAt,
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error("Updating user profile error: ", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = { getUserProfile, updateUserProfile };