const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Token = require("../models/Token");
const StripeSessionPayment = require("../models/stripePaymentSession");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");

const handleCheckoutSessionCompleted = async (event) => {
  const session = event.data.object;
  console.log("🚀 ~ handleCheckoutSessionCompleted ~ session:", session);

  console.log(
    "🚀 ~ handleCheckoutSessionCompleted ~ session.",
    session.payment_method_options
  );
  console.log(
    "🚀 ~ handleCheckoutSessionCompleted ~ session.payment_method_types:",
    session.payment_method_types
  );
  console.log(
    "🚀 ~ handleCheckoutSessionCompleted ~  session.invoice:",
    session.invoice
  );

  try {
    const {
      id: sessionId,
      payment_intent: paymentIntentId,
      customer: customerId,
      metadata,
      amount_total: amountTotal,
      currency,
      payment_status: paymentStatus,
    } = session;

    const userId = metadata.userId;
    const saleId = metadata.saleId;
    const tokenIn = parseInt(metadata.quantity, 10);
    console.log("🚀 ~ handleCheckoutSessionCompleted ~ tokenIn:", tokenIn);
    const tokenPriceInCents = parseInt(metadata.price, 10);
    const tokenOut = (tokenPriceInCents * tokenIn) / 100;
    console.log("🚀 ~ handleCheckoutSessionCompleted ~ tokenOut:", tokenOut);

    console.log(
      "🚀 ~ handleCheckoutSessionCompleted ~ session.paymentStatus:",
      session.payment_status
    );

    if (session.payment_status !== "paid") {
      return httpResponse(
        null,
        statusCode.badRequest,
        false,
        message.paymentStatusNotPaid
      );
    }
    console.error("metadata in session:", session.metadata);

    if (!userId || !tokenIn || !tokenPriceInCents) {
      return httpResponse(
        null,
        statusCode.badRequest,
        false,
        message.missingMetadata
      );
    }
    console.error("Token document not found");

    const user = await User.findById(userId);
    if (!user) {
      console.error("User not found for ID:", userId);
      return httpResponse(
        null,
        statusCode.notFound,
        false,
        message.userDoesnotExists
      );
    }

    user.tokenBalance += tokenIn;
    await user.save();

    console.log("User token balance updated:", user.tokenBalance);

    const transaction = new Transaction({
      userId,
      paymentIntentId,
      saleId: metadata.saleId,
      tokenIn,
      tokenOut: tokenOut.toFixed(2),
      paymentStatus: "completed",
      paymentType: "Stripe Checkout",
      transactionDate: new Date(),
    });
    await transaction.save();

    console.log("Transaction saved:", transaction);
    let token = await Token.findOne();
    if (!token) {
      console.log("Token document not found. Creating a new one...");
      token = new Token({
        tokenName: "PRC Coin",
        tokenSymbol: "PRC",
        totalSupply: 1000000000, // Example total supply
        fundsRaised: 0,
        availableTokens: 1000000000, // Initially equal to total supply
        claimedTokens: 0,
      });
    }

    token.claimedTokens += tokenIn;
    token.availableTokens -= tokenIn;
    token.fundsRaised += tokenOut;
    await token.save();

    console.log("Token document updated:", token);

    console.log("Token document updated:", token);
    // Save session data in StripeSessionPayment schema
    const stripeSessionPayment = new StripeSessionPayment({
      sessionId,
      paymentIntentId,
      customerId,
      tokenOut,
      currency,
      paymentStatus,
      userId,
      saleId,
      metadata,
      eventType: "checkout.session.completed",
      // invoiceDetails: {
      //   invoiceId: session.invoice?.id || null,
      //   amountDue: session.invoice?.amount_due
      //     ? session.invoice.amount_due / 100
      //     : null,
      //   amountPaid: session.invoice?.amount_paid
      //     ? session.invoice.amount_paid / 100
      //     : null,
      //   created: session.invoice?.created
      //     ? new Date(session.invoice.created * 1000)
      //     : null,
      //   currency: session.invoice?.currency || null,
      //   customerId: session.invoice?.customer || null,
      //   customerEmail: session.invoice?.customer_email || null,
      //   customerName: session.invoice?.customer_name || null,
      //   // invoiceUrl: session.invoice?.hosted_invoice_url || null,
      //   // invoicePdf: session.invoice?.invoice_pdf || null,
      //   paid: session.invoice?.paid || null,
      //   paymentIntent: session.invoice?.payment_intent || null,
      //   status: session.invoice?.status || null,
      //   statementDescriptor: session.invoice?.statement_descriptor || null,
      //   subtotal: session.invoice?.subtotal
      //     ? session.invoice.subtotal / 100
      //     : null,
      //   total: session.invoice?.total ? session.invoice.total / 100 : null,
      // },
    });
    await stripeSessionPayment.save();

    console.log("Stripe session payment saved:", stripeSessionPayment);

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
      expirationTime: new Date(),
      metadata: session.metadata || null,
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
