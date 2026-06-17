const Users = require('../models/Users');
const generateToken = require('../utils/generateToken');

// Route    POST /api/auth/register     public access
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, role, phone } = req.body;

        // validate required fields
        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        // check if username is already taken
        const usernameExists = await Users.findOne({ username: cleanUsername });
        if (usernameExists) {
            return res.status(400).json({ success: false, message: "Username already taken" });
        }

        // check if user already exists
        const userExists = await Users.findOne({ email: cleanEmail });
        if (userExists) {
            return res.status(400).json({ success: false, message: "Email registered with another account" });
        }

        // create user
        const user = await Users.create({ name, username: cleanUsername, email: cleanEmail, password, role, phone });

        // if user created successfully, return userdata and token (some data are defaults)
        return res.status(201).json({
            success: true,
            data: {
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                phone: user.phone,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                bloodType: user.bloodType,
                age: user.age,
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error("Registration error: ", err);
        return res.status(500).json({ message: "Server error" });
    }
};

// Route    POST /api/auth/login    public access
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validate input
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const cleanEmail = email.trim().toLowerCase();

        // find user by email
        const user = await Users.findOne({ email: cleanEmail });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // compare password hash
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }

        return res.status(200).json({
            success: true,
            data: {
                _id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                role: user.role,
                phone: user.phone,
                dateOfBirth: user.dateOfBirth,
                gender: user.gender,
                bloodType: user.bloodType,
                age: user.age,
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error("Login error: ", err);
        return res.status(500).json({ success: true, message: "Server error" });
    }
};

// Route    PUT /api/auth/changePass    private access
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // validate required fields
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const user = await Users.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // verify if current password matches the real password
        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrent current password" });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({ success: true, message: "Password changed successfully" });
    } catch (err) {
        console.error("Failed to change password: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { registerUser, loginUser, changePassword };