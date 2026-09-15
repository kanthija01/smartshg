const express = require('express');
const router = express.Router();
const { listSchemes, getSchemeDetails } = require('../controllers/schemeController');

// Schemes are informational and publicly readable
router.get('/', listSchemes);
router.get('/:id', getSchemeDetails);

module.exports = router;
