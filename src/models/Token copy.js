"use strict";
const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenName: {
      type: String,
      // default: "EncryptedCash"
    },
    tokenSymbol: {
      type: String,
      // default: "ECT"
    },
    tokenAddress: {
      type: String,
      // default: "0x0000000000000000000000000000000000000000"
    },
    totalSupply: {
      type: Number,
      // default: 100000000
    },
    fundsRaised: {
      type: Number,
      // default: 0
    },
    availableTokens: {
      type: Number,
      // default: 100000000
    },
    claimedTokens: {
      type: Number,
      // default: 0
    },
    finalTokensSold: {
      type: Number,
      default: 0,
    },
    icoFinalized: {
      type: Boolean,
      default: false,
    },
    tokenDecimals: {
      type: Number,
      // default: 18
    },
    tokenImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Token", tokenSchema);
