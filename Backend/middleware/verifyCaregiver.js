const Links = require('../models/CaregiverLink');

const verifyCaregiverPatientRelationship = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (req.user.role !== 'caregiver') {
            return res.status(403).json({ success: false, message: "Access denied. Not authorized" });
        }

        const activeLink = await Links.findOne({
            caregiver: req.user._id,
            patient: id,
            status: 'approved'
        });

        if (!activeLink) {
            return res.status(403).json({ success: false, message: "You are not linked to this patient" });
        }

        next();
    } catch (err) {
        console.error("Caregiver validation error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { verifyCaregiverPatientRelationship };