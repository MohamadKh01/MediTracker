const User = require('../models/User');

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
                email: user.email,
                role: user.role,
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
        const { name, phone } = req.body;

        if (!name || !phone) {
            return res.status(400).json({ message: "Please provide all fields" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { name, phone },
            { returnDocument: 'after', runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            return res.status(400).json({ message: "User not found" });
        }

        return res.status(200).json({
            success: true,
            data: {
                name: updatedUser.name,
                email: updatedUser.email,
                role: updatedUser.role,
                phone: updatedUser.phone || "",
                createdAt: updatedUser.createdAt
            }
        });
    } catch (err) {
        console.error("Profile update error: ", err);
        return res.status(500).json({ message: "Server error" });
    }
}

module.exports = { getUserProfile, updateUserProfile };