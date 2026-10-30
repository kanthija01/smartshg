const express = require("express");
const router = express.Router();
const { handleWebhook } = require("../controllers/paymentController");

// Razorpay webhook - no auth, raw body for HMAC
router.post("/webhook", handleWebhook);

module.exports = router;
