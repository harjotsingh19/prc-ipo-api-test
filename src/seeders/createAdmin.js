const bcrypt = require("bcrypt");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    const email = "prcadmin@yopmail.com";
    const password = "Admin@123";
    const role = "ADMIN";

    const existingAdmin = await User.findOne({ email }).exec();
    if (existingAdmin) {
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
    console.log("✅ Admin account created successfully.");
  } catch (error) {
    console.error("❌ Error creating admin account:", error.message);
  }
};

module.exports = createAdmin;
