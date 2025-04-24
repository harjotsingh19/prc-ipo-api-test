const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
const {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
} = require("../utils/stripeWebhookMethods.js"); // Import the helper methods

const handleStripeWebhook = async (req, res) => {
  try {
    console.log("🚀 ~ handleStripeWebhook ~ ");

    const event = req.body;

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event);
        console.log("session completed");
        break;

      case "payment_intent.succeeded":
        console.log("");
        console.log(
          "TCL: handleStripeWebhook payment_intent.succeeded -> event",
          event
        );
        console.log("");
        break;

      case "checkout.session.expired":
        console.log("Checkout session expired:", event.data.object);
        await handleCheckoutSessionExpired(event);
        break;

      case "payment_intent.payment_failed":
        console.log("Payment intent failed:", event.data.object);
        await handlePaymentIntentFailed(event);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).send({ received: true });
  } catch (error) {
    console.error("Error handling Stripe webhook:", error);
    res.status(500).send({ error: "Webhook handling failed" });
  }
};

module.exports = {
  handleStripeWebhook,
};
