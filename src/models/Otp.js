const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  otp: { type: String, required: true },
  operation: { type: Number, required: true },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300,
    index: true,
  },
});

module.exports = mongoose.model("Otp", otpSchema);
