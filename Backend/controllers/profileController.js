const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Route    GET /api/users/profile      private access
const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');

        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                dateOfBirth: user.dateOfBirth,
                age: user.age,
                bloodType: user.bloodType,
                gender: user.gender,
                phone: user.phone,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        console.error("Profile fetching error: ", err);
        return res.status(500).json({ message: "Server Error" });
    }
}

// Route    PUT /api/users/profile      private access
const updateUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // prevent updating password cause findByIdAndUpdate will bypass "pre-save" and store actual password instead of hash 
        if (req.body.password) {
            return res.status(400).json({ message: "Cannot update password through this endpoint" });
        }

        if (req.body.username) {
            const cleanUsername = req.body.username.trim().toLowerCase();
            if (cleanUsername !== user.username) {
                const usernameExists = await User.findOne({ username: cleanUsername });
                if (usernameExists) {
                    return res.status(400).json({ message: "Username already taken" });
                }
                req.body.username = cleanUsername;
            }
        }

        // prevent injection attacks (for example updating role to gain priviledges)
        const safeUpdates = {
            name: req.body.name,
            username: req.body.username,
            phone: req.body.phone,
            dateOfBirth: req.body.dateOfBirth,
            gender: req.body.gender,
            bloodType: req.body.bloodType
        };

        // delete undefined values
        Object.keys(safeUpdates).forEach(key => safeUpdates[key] === undefined && delete safeUpdates[key]);

        const updatedUser = await User.findByIdAndUpdate(
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
                gender: updatedUser.gender,
                bloodType: updatedUser.bloodType,
                age: updatedUser.age,
                createdAt: updatedUser.createdAt,
                token: generateToken(updatedUser._id),
            }
        });
    } catch (err) {
        console.error("Profile update Error: ", err);
        return res.status(500).json({ message: "Server error" });
    }
};

module.exports = { getUserProfile, updateUserProfile };