const mongoose = require("mongoose");

const refreshTokenSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Types.ObjectId,
    ref: "User",
    required: [true, "User Id is required"],
  },
  refreshToken: {
    type: String,
    index: true,
    required: true,
  },
});

module.exports = mongoose.model("RefreshTokens", refreshTokenSchema);
