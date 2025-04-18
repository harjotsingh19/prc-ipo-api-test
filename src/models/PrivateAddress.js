const mongoose = require("mongoose");

const privateAddressSchema = new mongoose.Schema(
  {
    walletAddress: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PrivateAddress", privateAddressSchema);
