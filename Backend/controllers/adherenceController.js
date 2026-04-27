const AdherenceLog = require('../models/AdherenceLog');

// route    POST /api/adherence    private access
const logDose = async (req, res) => {
    try {
        const { medicationId, dateString, scheduledTime, status } = req.body;

        // validate all fields
        if (!medicationId || !dateString || !scheduledTime) {
            return res.status(400).json({ message: "Please provide all required fields " });
        }

        // check if it already exists
        const existingLog = await AdherenceLog.findOne({
            user: req.user._id,
            medication: medicationId,
            dateString,
            scheduledTime
        });

        // if it exists, then delete (user unchecked taken mark)
        if (existingLog) {
            await existingLog.deleteOne();
            return res.status(200).json({ success: true, message: "Dose unmarked", action: "removed" });
        }
        else {
            // if it doesn't exist, then create (user checked taken mark)
            const log = await AdherenceLog.create({
                user: req.user._id,
                medication: medicationId,
                status: status,
                dateString,
                scheduledTime,
                takenAt: Date.now()
            });
            res.status(201).json({ success: true, data: log });
        }
    } catch (err) {
        console.error("Adherence log error: ", err);
        res.status(500).json({ message: "Server error" });
    }
};

// route    GET /api/adherence/:dateString      private access
const getLogsByDate = async (req, res) => {
    try {
        const logs = await AdherenceLog.find({
            user: req.user._id,
            dateString: req.params.dateString,
        });
        res.status(200).json({ success: true, data: logs });
    } catch (err) {
        console.error("Fetch logs error: ", err);
        res.status(500).json({ message: "Server error" });
    }
}

module.exports = { logDose, getLogsByDate };