const Users = require('../models/Users');

const { encryptDocumentPayload, decryptDocumentPayload } = require('../utils/encryptionService');
const { calculateAge } = require('../utils/helperFunctions');

// EMAIL VERIFICATION LOGIC
const { generateToken/*, generateOTP*/ } = require('../utils/generateToken');
// const { sendVerificationEmail } = require('../utils/emailService');
// const { resetVerifyEmailLimit } = require('../middleware/rateLimiter');

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

        // EMAIL VERIFICATION LOGIC
        // // generate 6 digits OTP and set 15 min expiration
        // const otpCode = generateOTP();
        // const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

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
            // emailVerificationCode: otpCode,
            // emailVerificationExpires: otpExpires,
            ...encryptedEnvelope
        });

        // EMAIL VERIFICATION LOGIC
        // await sendVerificationEmail(cleanEmail, otpCode);

        return res.status(201).json({
            success: true,
            message: "Registration successful! Please check your email for the verification code.",
            data: {
                email: user.email,
                isEmailVerified: user.isEmailVerified
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
                isEmailVerified: user.isEmailVerified,
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

// EMAIL VERIFICATION LOGIC 1/6
// // Route    POST /api/auth/resendVerification      public access
// const resendVerification = async (req, res) => {
//     try {
//         const { email } = req.body;
//         if (!email) {
//             return res.status(400).json({ success: false, message: "Email is required" });
//         }

//         const cleanEmail = email.trim().toLowerCase();
//         const user = await Users.findOne({ email: cleanEmail });

//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found!" });
//         }

//         if (user.isEmailVerified) {
//             return res.status(400).json({ success: false, message: "Email is already verified" });
//         }

//         const otpCode = generateOTP();
//         user.emailVerificationCode = otpCode;
//         user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000);

//         await user.save();

//         await sendVerificationEmail(cleanEmail, otpCode);

//         resetVerifyEmailLimit(req);

//         return res.status(200).json({ success: true, message: "A new verification code has been sent to your email." });
//     } catch (err) {
//         console.error("Resend Verification Error: ", err);
//         return res.status(500).json({ success: false, message: "Server error" });
//     }
// };

// // Route    POST /api/auth/verifyEmail     public accesss
// const verifyEmail = async (req, res) => {
//     try {
//         const { email, code } = req.body;
//         if (!email || !code) {
//             return res.status(400).json({ success: false, message: "Email and verification code are required" });
//         }

//         const cleanEmail = email.trim().toLowerCase();
//         const user = await Users.findOne({ email: cleanEmail });

//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         if (user.isEmailVerified) {
//             return res.status(200).json({ success: true, message: "Email is already verified!" });
//         }

//         if (user.emailVerificationCode !== code.trim()) {
//             return res.status(400).json({ success: false, message: "Invalid verification code" });
//         }

//         if (!user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
//             return res.status(400).json({ success: false, message: "Verification code has expired. Please request a new one." });
//         }

//         user.isEmailVerified = true;
//         user.emailVerificationCode = null;
//         user.emailVerificationExpires = null;
//         await user.save();

//         return res.status(200).json({ success: true, message: "Email verified successfully!" });
//     } catch (err) {
//         console.error("Verify email error: ", err);
//         return res.status(500).json({ success: false, message: "Server Error" });
//     }
// }

module.exports = { registerUser, loginUser, changePassword, /*verifyEmail, resendVerification*/ };
