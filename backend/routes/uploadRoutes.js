const express = require('express');
const router = express.Router();
const { getUploadSignature } = require('../controllers/uploadController');
const { uploadSignatureLimiter } = require('../middleware/rateLimiter');

// Public (vendor registration happens pre-auth). Rate-limited to prevent
// signature-endpoint abuse while allowing the many folders one registration needs.
router.get('/signature', uploadSignatureLimiter, getUploadSignature);

module.exports = router;
