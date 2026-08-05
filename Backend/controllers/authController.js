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

// Route    POST /api/auth/register     public access
const registerUser = async (req, res) => {
    try {
        const { name, username, email, password, role, phone } = req.body;

        // validate required fields
        if (!name || !username || !email || !password) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        // Password strength validation
        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passRegex.test(password)) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters and contain at least 1 uppercase, 1 lowercase, one number and one special character" });
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

        // encrypt profile data payload
        const profilePayload = {
            name,
            phone: phone || null,
            dateOfBirth: null,
            gender: "prefer not to say",
            bloodType: "not specified"
        }
        const encryptedEnvelope = encryptDocumentPayload(profilePayload);

        // create user
        const user = await Users.create({
            username: cleanUsername,
            email: cleanEmail,
            password,
            role,
            expoPushToken: req.body.expoPushToken || null,
            ...encryptedEnvelope
        });

        const decryptedProfile = decryptDocumentPayload(user);

        // if user created successfully, return userdata and token (some data are defaults)
        return res.status(201).json({
            success: true,
            data: {
                _id: user.id,
                ...decryptedProfile,
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error("Registration error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
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

        const decryptedProfile = decryptDocumentPayload(user);

        return res.status(200).json({
            success: true,
            data: {
                _id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                expoPushToken: user.expoPushToken,
                ...decryptedProfile,
                age: calculateAge(decryptedProfile.dateOfBirth),
                token: generateToken(user._id),
            }
        });
    } catch (err) {
        console.error("Login error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
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
