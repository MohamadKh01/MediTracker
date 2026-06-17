const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/protect');
const { sendInvitation, respondToInvitation, revokeRelationship, getLinks } = require('../controllers/linkController')

router.use(protect);

// Route    POST /api/link/invite
router.post("/invite", sendInvitation);

// Route    PUT /api/link/respond/:id
router.put('/respond/:id', respondToInvitation);

// Route    PUT /api/link/revoke/:id
router.put('/revoke/:id', revokeRelationship);

// Route    GET /api/link/mylinks
router.get('/myLinks', getLinks);

module.exports = router;