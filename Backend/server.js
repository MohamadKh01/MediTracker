// these two lines override mongoDB ECONNREFUSED error
const dns = require('node:dns/promises');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

const connectDB = require('./config/db.js');

const { startNotificationCronEngine } = require('./utils/cronEngine.js');

const notFound = require('./middleware/notFound.js');
const logger = require('./middleware/logger.js');
const errorHandler = require('./middleware/errorMiddleware.js');

const authRoutes = require('./routes/authRoutes.js');
const profileRoutes = require('./routes/profileRoutes.js');
const medicationRoutes = require('./routes/medicationRoutes.js');
const adherenceRoutes = require('./routes/adherenceRoutes.js');
const linkRoutes = require('./routes/linkRoutes.js');
const caregiverRoutes = require('./routes/caregiverRoutes.js');

// load .env file content into proces.env
dotenv.config();

// connect to mongoDB
connectDB();

// middlewares
const app = express();

// ping route to keep render awake
app.get('/hp', (req, res) => {
    res.status(200).send("Alive");
});

app.use(cors());
app.use(express.json());
app.use(logger);

// routes
app.use('/api/auth', authRoutes);
app.use('/api/users', profileRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/adherence', adherenceRoutes);
app.use('/api/link', linkRoutes);
app.use('/api/caregiver', caregiverRoutes);

// error middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`App listening on http://localhost:${PORT}`);
    startNotificationCronEngine();
});