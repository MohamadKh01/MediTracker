const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

// import database connection function
const connectDB = require('./config/db.js')

// load .env file content into process.env
dotenv.config();

//connect to mongoDB
connectDB();

// middleware
const app = express();
app.use(cors());
app.use(express.json());

// basic route
app.get('/', (req, res) => {
    res.send('MediTracker API is running...');
});

app.listen(process.env.PORT, () => {
    console.log(`app listening on http://localhost:${process.env.PORT}`);
});