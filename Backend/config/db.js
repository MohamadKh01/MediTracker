const mongoose = require('mongoose');

// database connection code
async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to mongoDB');
    } catch (err) {
        console.error('Failed to connect to MongoDB!', err);
        process.exit(1);
    }
}

module.exports = connectDB;