const cron = require("node-cron");
const User = require("../models/User");
const { sendEmailToMultipleUsers } = require("./mailManager");
const { emailTemplateId } = require("../config/constants");
/* 
 SCHEDULE JOBS TO SEND REMINDER TO USERS TO ADD WALLET ADDRESS
*/
cron.schedule("0 0 * * *", async () => {
  try {
    const usersWithoutWallet = await User.find({
      walletAddress: { $in: [null, ""] },
    });

    if (usersWithoutWallet.length) {
      const mailData = usersWithoutWallet.map((user) => ({
        to: [{ email: user.email }],
        dynamic_template_data: {
          first_name: user.firstName,
        },
      }));

      const response = await sendEmailToMultipleUsers(
        emailTemplateId.emailVerification,
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
