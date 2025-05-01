const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Token = require("../models/Token");
const StripeSessionPayment = require("../models/stripePaymentSession");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message, emailTemplateId } = require("../config/constants");
const { sendEmail } = require("../utils/mailManager");
const crypto = require("crypto");

const handleCheckoutSessionCompleted = async (event) => {
  const session = event.data.object;
  console.log("🚀 ~ handleCheckoutSessionCompleted ~ session:", session);

  try {
    const {
      id: sessionId,
      payment_intent: paymentIntentId,
      customer: customerId,
      metadata,
      currency,
      payment_status: paymentStatus,
    } = session;

    const userId = metadata.userId;
    const saleId = metadata.saleId;
    const tokenIn = metadata.tokenIn;
    const tokenOut = metadata.tokenOut;

    if (session.payment_status !== "paid") {
      return httpResponse(
        null,
        statusCode.badRequest,
        false,
        message.paymentStatusNotPaid
      );
    }
    console.error("metadata in session:", session.metadata);

    if (!userId || !tokenIn || !tokenOut) {
      return httpResponse(
        null,
        statusCode.badRequest,
        false,
        message.missingMetadata
      );
    }
    console.error("Token document not found");

    const user = await User.findById(userId).exec();
    if (!user) {
      console.error("User not found for ID:", userId);
      return httpResponse(
        null,
        statusCode.notFound,
        false,
        message.userDoesnotExists
      );
    }

    user.tokenBalance += Number(tokenIn);
    await user.save();

    const now = new Date();
    const formattedDate = now.toISOString().split("T")[0];
    const timestamp = Date.now().toString(36);
    const randomPart = crypto.randomBytes(4).toString("hex");

    const paymentReferenceId = `prc-${formattedDate}-${timestamp}-${randomPart}`;

    const transaction = new Transaction({
      userId,
      paymentIntentId,
      saleId: saleId,
      tokenIn,
      tokenOut,
      paymentStatus: "Paid",
      transactionDate: new Date(),
      paymentReferenceId,
    });
    await transaction.save();

    console.log("Transaction saved:", transaction);

    let token = await Token.findOne().exec();
    if (!token) {
      console.log("Token document not found. Creating a new one...");
      token = new Token({
        tokenName: "PRC Coin",
        tokenSymbol: "PRC",
        totalSupply: 1000000000,
        fundsRaised: 0,
        availableTokens: 1000000000,
        claimedTokens: 0,
      });
    }

    token.claimedTokens += Number(tokenIn);
    token.fundsRaised += Number(tokenOut);
    await token.save();

    await sendEmail(user.email, emailTemplateId.purchaseConfirmation, {
      user_name: user.firstName,
      amount: tokenOut,
      transaction_id: transaction._id,
      date: transaction.transactionDate,
      token_purchased: transaction.tokenIn,
    });

    await StripeSessionPayment.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        paymentIntentId,
        customerId,
        tokenIn,
        tokenOut,
        currency,
        paymentStatus,
        userId,
        saleId,
        metadata,
        eventType: "checkout.session.completed",
        email: session.customer_details.email || null,
        sessionCreationTime: session.created,
        sessionExpirationTime: session.expires_at || null,
        failureReason: session.failure_reason || null,
        expirationTime: session.expires_at
          ? new Date(session.expires_at * 1000)
          : null,
        status: session.status,
      },
      { new: true, upsert: true }
    );

    console.log(`Tokens credited to user ${userId}: ${tokenIn}`);

    return { success: true, data: { resData: {} } };
  } catch (error) {
    console.error("Error handling checkout.session.completed:", error);
    return httpResponse(
      null,
      statusCode.errorPage,
      false,
      message.webhookProcessingError
    );
  }
};

const handleCheckoutSessionExpired = async (event) => {
  const session = event.data.object;

  try {
    console.log("Handling expired session:", session.id);

    const stripeSessionPayment = new StripeSessionPayment({
      sessionId: session.id,
      customerId: session.customer || null,
      userId: session.metadata?.userId || null,
      saleId: session.metadata?.saleId || null,
      email: sessionData.customer_details.email || null,
      expirationTime: new Date(),
      metadata: session.metadata || null,
      sessionCreationTime: sessionData.created || null,
      sessionExpirationTime: sessionData.expires_at || null,
      paymentIntentId: session.payment_intent || null,
      eventType: "checkout.session.expired",
    });

    await stripeSessionPayment.save();
    console.log("Expired session saved:", stripeSessionPayment);
  } catch (error) {
    console.error("Error handling expired session:", error);
  }
};

const handlePaymentIntentFailed = async (event) => {
  const paymentIntent = event.data.object;

  try {
    console.log("Handling failed payment intent:", paymentIntent.id);

    const stripeSessionPayment = new StripeSessionPayment({
      paymentIntentId: paymentIntent.id || null,
      customerId: paymentIntent.customer || null,
      userId: paymentIntent.metadata?.userId || null,
      saleId: paymentIntent.metadata?.saleId || null,
      amountTotal: paymentIntent.amount || null,
      currency: paymentIntent.currency || null,
      failureReason: paymentIntent.last_payment_error?.message || null,
      metadata: paymentIntent.metadata || null,
      paymentStatus: "failed",
      eventType: "payment_intent.payment_failed",
    });

    await stripeSessionPayment.save();
    console.log("Failed payment saved:", stripeSessionPayment);
  } catch (error) {
    console.error("Error handling failed payment intent:", error);
  }
};
module.exports = {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
};
