const express = require("express");
const router = express.Router();
const webHookController = require("../controllers/webHookController.js");
const { auth } = require("../middleware/auth");
// const userValidator = require("../utils/validators/user");

router.post("/", webHookController.handleStripeWebhook);

module.exports = router;
