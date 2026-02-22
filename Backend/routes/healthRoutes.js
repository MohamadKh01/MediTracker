const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.status(200).json({status: "API running"});
});

module.exports = router;