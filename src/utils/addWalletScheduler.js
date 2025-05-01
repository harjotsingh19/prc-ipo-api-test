const cron = require("node-cron");
const User = require("../models/User");
const { sendEmailToMultipleUsers } = require("./mailManager");
const { emailTemplateId } = require("../config/constants");

cron.schedule("0 0 * * 0", async () => {
  // cron.schedule("* * * * *", async () => {
  try {
    console.log("wallet link scheduler");

    const usersWithoutWallet = await User.find({
      walletAddress: { $in: [null, ""] },
      role: "INVESTOR",
    });
    console.log("🚀 ~ cron.schedule ~ usersWithoutWallet:", usersWithoutWallet);

    if (usersWithoutWallet.length) {
      const mailData = usersWithoutWallet.map((user) => ({
        to: [{ email: user.email }],
        dynamic_template_data: {
          user_name: user.firstName,
        },
      }));

      const response = await sendEmailToMultipleUsers(
        emailTemplateId.addWallet,
        mailData
      );
      console.log("✅ MAIL SENT TO USERS", response);
    } else {
      console.log("ℹ️ NO USERS! MAIL NOT SENT");
    }
  } catch (error) {
    console.error("❌ Error in SEND EMAIL scheduler:", error.message);
  }
});
