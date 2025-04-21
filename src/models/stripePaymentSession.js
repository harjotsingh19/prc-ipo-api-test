const mongoose = require("mongoose");

const stripeSessionPaymentSchema = new mongoose.Schema(
  {
    sessionId: { type: String },
    paymentIntentId: { type: String },
    customerId: { type: String },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: "Sale" },
    tokenOut: { type: Number },
    currency: { type: String },
    paymentStatus: { type: String, default: "unpaid" },
    failureReason: { type: String, default: null },
    expirationTime: { type: Date, default: null },
    metadata: { type: Object, default: {} },
    eventType: { type: String, required: true },
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
