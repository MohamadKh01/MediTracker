const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const connectDB = require('./config/db.js');
const notFound = require('./middleware/notFound.js');
const errorHandler = require('./middleware/errorMiddleware.js');

// load .env file content into process.env
dotenv.config();

//connect to mongoDB
connectDB();

// middleware
const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use('/api/health', require('./routes/healthRoutes.js'));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`app listening on http://localhost:${process.env.PORT}`);
});