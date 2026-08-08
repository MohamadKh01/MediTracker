const jwt = require('jsonwebtoken');

// generate session token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// generate a random 6 digits code string
const generateOTP = () => {
    return Math.floor(100000 + Math.random * 900000).toString();
};

module.exports = { generateToken, generateOTP };