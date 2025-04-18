'use strict';
const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  tokenName: {
    type: String,
    default: "PRC Coin"
  },
  tokenSymbol: {
    type: String,
    default: "PRC"
  },
  totalSupply: {
    type: Number,
    default: 1000000000  // Example supply, can be adjusted
  },
  fundsRaised: {
    type: Number,
    default: 0
  },
  // availableTokens: {
  //   type: Number,
  //   default: 1000000000  // Example available tokens, can be adjusted
  // },
  // claimedTokens: {
  //   type: Number,
  //   default: 0
  // },
  // icoFinalized: {
  //   type: Boolean,
  //   default: false
  // },
  // tokenDecimals: {
  //   type: Number,
  //   default: 18
  // },
  tokenImage: {
    type: String,
    default: ""  // URL to token image, if any
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Token', tokenSchema);
