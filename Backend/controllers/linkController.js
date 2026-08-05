const Users = require('../models/Users');
const Links = require('../models/CaregiverLink');

const { decryptDocumentPayload } = require('../utils/encryptionService');

// helper function to calculate age dynamically from DOB
const calculateAge = (dob) => {
    if (!dob) {
        return null;
    }

    const today = new Date();
    const birthDate = new Date(dob);
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const balancedMonth = today.getMonth() - birthDate.getMonth();
    if (balancedMonth < 0 || (balancedMonth === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
    }
    return calculatedAge;
}

// Route    POST /api/link/invite       private access
const sendInvitation = async (req, res) => {
    try {
        const { targetId } = req.body;

        if (!targetId) {
            return res.status(400).json({ success: false, message: "Please provide an email or a username" });
        }

        const targetUser = await Users.findOne({
            $or: [
                { email: targetId.trim().toLowerCase() },
                { username: targetId.trim().toLowerCase() }
            ]
        });

        if (!targetUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (targetUser._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "Cannot link yourself" });
        }

        if (req.user.role === targetUser.role) {
            return res.status(400).json({ success: false, message: `Cannot link another ${targetUser.role}` });
        }

        let caregiverId, patientId;
        if (targetUser.role === "patient") {
            patientId = targetUser._id;
            caregiverId = req.user._id;
        } else if (targetUser.role === "caregiver") {
            caregiverId = targetUser._id;
            patientId = req.user._id;
        }

        let link = await Links.findOne({ caregiver: caregiverId, patient: patientId });

        if (link) {
            if (link.status === 'approved') {
                return res.status(400).json({ success: false, message: "This user is already linked" });
            } else if (link.status === 'pending') {
                if (link.initiatedBy !== req.user.role) {
                    link.status = "approved";
                    await link.save();
                    return res.status(200).json({ success: true, message: "Link auto-approved", data: link });
                }
                return res.status(400).json({ success: false, message: "Invitation already pending" });
            } else if (link.status === 'rejected' || link.status === 'revoked') {
                link.status = 'pending';
                link.initiatedBy = req.user.role;
                await link.save();
                return res.status(200).json({ success: true, message: "Invitation re-sent successfully", data: link });
            }
        }

        const newLink = await Links.create({
            caregiver: caregiverId,
            patient: patientId,
            initiatedBy: req.user.role,
            status: 'pending'
        });

        return res.status(200).json({ success: true, message: "Invitation sent successfully", data: newLink });
    } catch (err) {
        console.error("Invitation processing error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// Route    PUT /api/link/respond/:id       private access
const respondToInvitation = async (req, res) => {
    try {
        const { action } = req.body;
        const { id } = req.params;

        if (action !== 'approved' && action !== 'rejected') {
            return res.status(400).json({ success: false, message: "Invalid action params" });
        }

        const link = await Links.findById(id);
        if (!link) {
            return res.status(404).json({ success: false, message: "Invitation not found" });
        }

        if (link.status !== 'pending') {
            return res.status(400).json({ success: false, message: "Invitation expired" });
        }

        const userIsSender = (req.user.role === link.initiatedBy);
        if (userIsSender) {
            return res.status(403).json({ success: false, message: "Cannot respond to an invitation you initiated" });
        }

        link.status = action;
        await link.save();

        return res.status(200).json({ success: true, message: `Invitation ${action}`, data: link });
    } catch (err) {
        console.error("Process response error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    PUT /api/link/revoke/:id    private access
const revokeRelationship = async (req, res) => {
    try {
        const { id } = req.params;

        const link = await Links.findById(id);
        if (!link) {
            return res.status(404).json({ success: false, message: "Connection not found" });
        }

        const isAuthorized = link.caregiver.toString() === req.user._id.toString() || link.patient.toString() === req.user._id.toString();
        if (!isAuthorized) {
            return res.status(401).json({ success: false, message: "Unauthorized action" });
        }

        link.status = 'revoked';
        await link.save();

        return res.status(200).json({ success: true, message: "Revoke successful", data: link });
    } catch (err) {
        console.error("Revocation failed: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Route    GET /api/link/myLinks      private access
const getLinks = async (req, res) => {
    try {
        let query = {};
        let populateTarget = '';

        if (req.user.role === 'caregiver') {
            query = { caregiver: req.user._id, status: { $in: ['pending', 'approved'] } };
            populateTarget = 'patient';
        } else if (req.user.role === 'patient') {
            query = { patient: req.user._id, status: { $in: ['pending', 'approved'] } };
            populateTarget = 'caregiver';
        }

        const connections = await Links.find(query)
            .populate(populateTarget)
            .sort({ updatedAt: -1 });

        const decryptedConnections = connections.map(conn => {
            const connObj = conn.toObject();
            const targetUserDoc = connObj[populateTarget];

            if (targetUserDoc && targetUserDoc.encryptedPayload) {
                const decryptedProfile = decryptDocumentPayload(targetUserDoc);
                connObj[populateTarget] = {
                    _id: targetUserDoc._id,
                    username: targetUserDoc.username,
                    email: targetUserDoc.email,
                    role: targetUserDoc.role,
                    ...decryptedProfile,
                    age: calculateAge(decryptedProfile.dateOfBirth),
                };
            }

            return connObj;
        })

        return res.status(200).json({ success: true, count: decryptedConnections.length, data: decryptedConnections });
    } catch (err) {
        console.error("Query link metrics error: ", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

module.exports = { sendInvitation, respondToInvitation, revokeRelationship, getLinks };