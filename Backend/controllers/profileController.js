const Users = require('../models/Users');
const generateToken = require('../utils/generateToken');

// Route    GET /api/users/profile      private access
const getUserProfile = async (req, res) => {
    try {
        const user = await Users.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                age: user.age,
                bloodType: user.bloodType,
                phone: user.phone,
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

        // prevent injection attacks (for example cannot inject role change)
        const safeUpdates = {
            name: req.body.name,
            username: req.body.username,
            phone: req.body.phone,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            bloodType: req.body.bloodType,
            expoPushToken: req.body.expoPushToken
        };

        // delete undefined values
        Object.keys(safeUpdates).forEach(key => safeUpdates[key] === undefined && delete safeUpdates[key]);

        const updatedUser = await Users.findByIdAndUpdate(
            req.user._id,
            safeUpdates,
            { returnDocument: 'after', runValidators: true }
        );

        return res.status(200).json({
            success: true,
            data: {
                _id: updatedUser._id,
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                role: updatedUser.role,
                dateOfBirth: updatedUser.dateOfBirth,
                age: updatedUser.age,
                gender: updatedUser.gender,
                bloodType: updatedUser.bloodType,
                createdAt: updatedUser.createdAt,
                token: generateToken(updatedUser._id),
            }
        });
    } catch (err) {
        console.error("Updating user profile error: ", err);
        return res.status(500).json({ success: false, message: "Server Error" });
    }
}

module.exports = { getUserProfile, updateUserProfile };