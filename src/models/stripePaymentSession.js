const mongoose = require("mongoose");

const stripeSessionPaymentSchema = new mongoose.Schema(
  {
    sessionId: { type: String, default: null },
    paymentIntentId: { type: String, default: null },
    customerId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, default: null },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    tokenIn: { type: Number, default: 0 },
    tokenOut: { type: Number, default: 0 },
    currency: { type: String },
    sessionCreationTime: { type: Number, default: null },
    sessionExpirationTime: { type: Number, default: null },
    paymentStatus: { type: String, default: "unpaid" },
    failureReason: { type: String, default: null },
    metadata: { type: Object, default: {} },
    eventType: { type: String, required: true },
    status: { type: String, default: "incomplete" },
    // invoiceDetails: {
    //   invoiceId: { type: String },
    //   amountDue: { type: Number },
    //   amountPaid: { type: Number },
    //   created: { type: Date },
    //   currency: { type: String },
    //   customerId: { type: String },
    //   customerEmail: { type: String },
    //   customerName: { type: String },
    //   invoiceUrl: { type: String },
    //   invoicePdf: { type: String },
    //   paid: { type: Boolean },
    //   paymentIntent: { type: String },
    //   status: { type: String },
    //   statementDescriptor: { type: String },
    //   subtotal: { type: Number },
    //   total: { type: Number },
    // },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "StripeSessionPayment",
  stripeSessionPaymentSchema
);
