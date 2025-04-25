const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  otp: { type: String, required: true, ref: "Otp" },
  otpExpires: { type: Date, required: true },
  expiry: { type: Date, default: Date.now() },
  operation: { type: Number, required: true },
});

otpSchema.path("expiry").index({ expires: 300 });

module.exports = mongoose.model("Otp", otpSchema);
