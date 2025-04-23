const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema(
  {
    tokenName: {
      type: String,
      default: "PRC Coin",
    },
    tokenSymbol: {
      type: String,
      default: "PRC",
    },
    totalSupply: {
      type: Number,
      default: 1000000000, // Example supply, can be adjusted
    },
    fundsRaised: {
      type: Number,
      default: 0,
    },
    availableTokens: {
      type: Number,
      default: 1000000000, // Initially equal to totalSupply
    },
    claimedTokens: {
      type: Number,
      default: 0, // Tracks total tokens sold
    },
    tokenImage: {
      type: String,
      default: "", // URL to token image, if any
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Token", tokenSchema);
