const jwt = require('jsonwebtoken');
const Users = require('../models/Users');

// make sure user is logged in
const protect = async (req, res, next) => {
    try {
        let token;

        // check if authorization header exists with format "Bearer [token]"
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Not authorized, no token" });
        }

        // verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // attach all user data except password to the req object
        req.user = await Users.findById(decoded.id).select('-password');
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Not authorized, token failed" });
    }
};

// make sure the logged in user have the correct role
const authorize = async (...roles) => {
    return (req, res, next) => {
        // check if current user's role is allowed to access this route
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: `Access denied: role ${req.user.role} not authorized` });
        }
        next();
    };
};

module.exports = { protect, authorize };