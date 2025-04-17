'use strict';
const mongoose = require('mongoose');

const txnSchema = new mongoose.Schema({
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
  from: {
    type: String,
  },
  to: {
    type: String,
  },
  value: {
    type: Number
  },
  tokenAmount: {
    type: Number
  },
  tokenPrice: {
    type: Number
  },
  assetAmount: {
    type: Number
  },
  asset: {
    type: String
  },
  saleId: {
    type: mongoose.Schema.Types.ObjectId
  }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Transaction', txnSchema);