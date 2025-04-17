'use strict';
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  saleId: {
    type: Number,
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  active: {
    type: Boolean,
  },
  tokenPrice: {
    type: Number
  },
  txnHash: {
    type: String,
    default: "",
  },
  blockNumber: {
    type: Number,
    default: "",
  },
  blockHash: {
    type: String,
    default: "",
  },
  txnIndex: {
    type: Number,
    default: "",
  },
  saleName: {
    type: String,
    default: "",
  },
  isPrivate: {
    type: Boolean,
    default: true,
  },
  isFinalized: {
    type: Boolean,
    default: false,
  },
  isImmediateFinalized: {
    type: Boolean,
    default: false,
  },
  softCap: {
    type: Number
  },
  hardCap: {
    type: Number
  },
  minPurchaseAmount: {
    type: Number
  },
  maxPurchaseAmount: {
    type: Number
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

module.exports = mongoose.model('Sale', saleSchema);