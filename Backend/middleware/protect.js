const jwt = require('jsonwebtoken');
const User = require('../models/User');


// make sure the user is logged in
const protect = async (req, res, next) => {
    try {
        let token;

        // check if authorization header exists with format "Bearer [token]"
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }

        // verify token using secret key
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // attach all user data except password to the request object for later use
        req.user = await User.findById(decoded.id).select('-password');
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized, Token failed' });
    }
};

// make sure logged in user have the correct role
const authorize = async (...roles) => {
    return (req, res, next) => {
        // check if current user's role is allowed to access this route
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Access denied: role ${req.user.role} not authorized` });
        }
        next();
    };
};

module.exports = { protect, authorize };