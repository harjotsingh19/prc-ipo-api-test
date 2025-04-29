"use strict";
const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    active: {
      type: Boolean,
    },
    tokenPrice: {
      type: Number,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    // status: {
    //   type: String,
    //   enum: ["active", "upcoming", "closed"],
    //   default: "upcoming",
    // },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

module.exports = mongoose.model("Sale", saleSchema);
