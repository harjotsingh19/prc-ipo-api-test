const mongoose = require('mongoose');

const tokenClaimHistorySchema = new mongoose.Schema({
  txnHash: {
    type: String
  },
  blockNumber: {
    type: Number
  },
  blockHash: {
    type: String
  },
  txnIndex: {
    type: Number
  },
  gas: {
    type: Number
  },
  gasPrice: {
    type: Number
  },
  tokenAmount: {
    type: Number
  },
  investorAddress: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('TokenClaimHistory', tokenClaimHistorySchema);
