const express = require("express");
const router = express.Router();
const webHookController = require("../controllers/webHookController.js");
const { verifyWebhookSecret } = require("../middleware/webhookValidator");

router.post("/", verifyWebhookSecret, webHookController.handleStripeWebhook);

module.exports = router;
