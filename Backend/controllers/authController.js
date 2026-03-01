const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// route   POST /api/auth/register      public access
const registerUser = async (req, res) => {
    try {
        const { name, email, password, role, phone } = req.body;

        // validate required fields
        if(!name || !email || !password){
            return res.status(400).json({ message: 'Please provide name, email, and password' });
        }

        // check if user already exists
        const userExists = await User.findOne({ email });

        if(userExists){
            return res.status(400).json({ message: 'User already exists' });
        }

        // create user
        const user = await User.create({ name, email, password, role, phone });

        // if user created successfully, return user data and token
        return res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
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
        if(!email || !password){
            return res.status(400).json({ message: 'please provide email and password'});
        }

        // find user by email
        const user = await User.findOne({ email });

        if(!user){
            return res.status(400).json({ message: 'User not found' });
        }

        // compare password hashs
        const isMatch = await user.matchPassword(password);

        if(!isMatch) {
            return res.status(401).json({ message: "Invalid password"});
        }

        return res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            token: generateToken(user._id),
        });
    } catch (err) {
        console.log('Login error: ', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { registerUser, loginUser };