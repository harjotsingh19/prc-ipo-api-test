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

    // return res.status(200).send({ received: true });
    const event = req.body; // Stripe webhook payload
    // console.log("🚀 ~ handleStripeWebhook ~ event:", event);

    switch (event.type) {
      case "checkout.session.completed":
        console.log("session completed");
        // console.log("");
        // console.log(
        //   "TCL: handleStripeWebhook -> session checkout event",
        //   event
        // );
        // console.log("");

        await handleCheckoutSessionCompleted(event);
        break;

        // case "payment_intent.succeeded":
        //   console.log("");
        //   console.log(
        //     "TCL: handleStripeWebhook payment_intent.succeeded -> event",
        //     event
        //   );
        //   console.log("");
        //   // await stripeWebhookMethods.handlePaymentIntentSucceeded(event);
        //   break;

        // case "payment_intent.payment_failed":
        //   console.log("");
        //   console.log(
        //     "TCL: handleStripeWebhook pyment_intent_failed -> event",
        //     event
        //   );
        console.log("payment_intent.succeeded ends");
        // await stripeWebhookMethods.handlePaymentIntentFailed(event);
        break;

      case "checkout.session.expired":
        console.log("Checkout session expired:", event.data.object);
        await handleCheckoutSessionExpired(event);
        break;

      case "payment_intent.payment_failed":
        console.log("Payment intent failed:", event.data.object);
        await handlePaymentIntentFailed(event);
        break;

      // case "invoice.payment_succeeded":
      //   console.log("");
      //   console.log(
      //     "TCL: handleStripeWebhook invoice.payment_succeeded in-> event",
      //     event
      //   );

      // case "invoice.paid":
      //   console.log("");
      //   console.log("TCL: handleStripeWebhook invoice.paid in-> event", event);
      //   console.log("");

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
