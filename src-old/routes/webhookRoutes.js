const express = require("express");
const router = express.Router();
const webHookController = require("../controllers/webHookController.js");
const { verifyWebhookSecret } = require("../middleware/webhookValidator"); // Import the middleware

router.post("/", verifyWebhookSecret, webHookController.handleStripeWebhook); // Add middleware here

module.exports = router;
