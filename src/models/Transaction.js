"use strict";
const mongoose = require("mongoose");

const txnSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      // required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
    },
    paymentIntentId: { type: String, required: true },
    // amountPaid: {
    //   type: Number,
    //   required: true,
    // },
    // tokenAmount: {
    //   type: Number,
    //   required: true,
    // },

    tokenIn: {
      type: String,
      required: true, //100 pRC
    },

    tokenOut: {
      type: String,
      required: true, //100 USD
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    paymentTokenOutStatus: {
      type: Boolean,
      default: false,
    },
    paymentType: {
      type: String, // e.g., 'credit card', 'debit card', 'bank transfer', etc.
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
    paymentHash: {
      type: String, // e.g., 'credit card', 'debit card', 'bank transfer', etc.
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Transaction", txnSchema);
