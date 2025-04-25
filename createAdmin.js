const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./src/models/User");
const config = require("./src/config/config");

mongoose
  .connect(config.mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

const createAdmin = async () => {
  try {
    const email = "prcadmin@yopmail.com";
    const password = "Admin@123";
    const role = "ADMIN";

    const existingAdmin = await User.findOne({ email }).exec();
    if (existingAdmin) {
      console.log("Admin account already exists.");
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const admin = new User({
      firstName: "Admin",
      lastName: "User",
      email,
      password: hashedPassword,
      role,
      isEmailVerified: true,
      isActive: true,
      isBlocked: false,
    });

    await admin.save();
    console.log("Admin account created successfully.");
  } catch (error) {
    console.error("Error creating admin account:", error.message);
  } finally {
    mongoose.connection.close();
  }
};

createAdmin();
