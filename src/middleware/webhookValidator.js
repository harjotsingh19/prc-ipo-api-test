const stripe = require("stripe")(process.env.STRIPE_TOKEN);
const { statusCode, message } = require("../config/constants");

const verifyWebhookSecret = (req, res, next) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log("🚀 ~ verifyWebhookSecret ~ webhookSecret:", webhookSecret);
  const signature = req.headers["stripe-signature"];
  console.log("🚀 ~ verifyWebhookSecret ~ signature:", signature);

  try {
    const event = stripe.webhooks.constructEvent(
      req.rawBody,
      signature,
      webhookSecret
    );

    console.log("✅ Webhook event received:", event);

    req.stripeEvent = event;

    next();
  } catch (err) {
    console.error("⚠️  Webhook signature verification failed:", err);
    return res.status(statusCode.badRequest).json({
      success: false,
      message: message.webhookSignatureVerificationFailed,
      error: err.message,
    });
  }
};

module.exports = { verifyWebhookSecret };
