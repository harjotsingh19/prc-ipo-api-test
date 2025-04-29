const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
const {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
} = require("../utils/stripeWebhookMethods.js");

const handleStripeWebhook = async (req, res) => {
  try {
    const event = req.body;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        break;

      case "payment_intent.succeeded":
        break;

      case "checkout.session.expired":
        await handleCheckoutSessionExpired(event);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event);
        break;

      default:
        break;
    }

    return res.status(200).send({ received: true });
  } catch (error) {
    res.status(500).send({ error: "Webhook handling failed" });
  }
};

module.exports = {
  handleStripeWebhook,
};
