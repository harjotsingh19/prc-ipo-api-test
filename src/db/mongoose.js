const mongoose = require("mongoose");
const config = require("../config/config");

mongoose
  .connect(config.mongoUri)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // Emit a custom event for post-connection tasks
    mongoose.connection.emit("connectedReady");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

module.exports = mongoose;
