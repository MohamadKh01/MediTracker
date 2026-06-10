const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// route   POST /api/auth/register      public access
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, role, phone } = req.body;

        // validate required fields
        if (!name || !username || !email || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        //check if username already taken
        const usernameExists = await User.findOne({ username: cleanUsername });
        if (usernameExists) {
            return res.status(400).json({ message: "Username already taken" });
        }

        // check if user already exists
        const userExists = await User.findOne({ email: cleanEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // create user
        const user = await User.create({ name, username: cleanUsername, email: cleanEmail, password, role, phone });

        // if user created successfully, return user data and token (some are defaults)
        return res.status(201).json({
            _id: user._id,
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
        });
    } catch (err) {
        console.error('Register Error: ', err);
        return res.status(500).json({ message: 'server error' });
    }

};

// route   POST /api/auth/login         public access
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // validate input
        if (!email || !password) {
            return res.status(400).json({ message: 'please provide email and password' });
        }

        // find user by email
        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // compare password hashs
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        return res.status(200).json({
            _id: user._id,
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
        });
    } catch (err) {
        console.log('Login error: ', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// Route    PUT /api/auth/changePassword    private access
const changePassword = async (req, res) => {
    try {
        const { currentPass, newPass } = req.body;

        if (!currentPass || !newPass) {
            return res.status(400).json({ message: "Please provide both current and old password" });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // verify if the currentPass is matching the real password
        const isMatch = await user.matchPassword(currentPass);
        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect current password" });
        }

        user.password = newPass;
        await user.save();

        return res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        console.error("Change password error: ", err);
        return res.status(500).json({ message: "Server error" });
    }
}
module.exports = { registerUser, loginUser, changePassword };