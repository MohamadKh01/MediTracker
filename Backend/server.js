// these two lines to override mongoDB ECONNREFUSED error
const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const connectDB = require('./config/db.js');
const notFound = require('./middleware/notFound.js');
const errorHandler = require('./middleware/errorMiddleware.js');
const logger = require('./middleware/logger.js');
const authRoutes = require('./routes/authRoutes.js');
const medRoutes = require('./routes/medicationRoutes.js');

// load .env file content into process.env
dotenv.config();

//connect to mongoDB
connectDB();

// middleware
const app = express();
app.use(cors());
app.use(express.json());
app.use(logger);

// routes
app.use('/api/health', require('./routes/healthRoutes.js'));
app.use('/api/auth', authRoutes);
app.use('/api/medications', medRoutes);

// error middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`app listening on http://localhost:${PORT}`);
});