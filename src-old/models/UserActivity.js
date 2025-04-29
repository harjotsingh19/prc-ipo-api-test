const mongoose = require("mongoose");

const userActivitySchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    timestamp: { type: Number },
    from: { type: String },
    message: { type: String },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("UserActivity", userActivitySchema);
