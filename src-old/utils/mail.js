const nodemailer = require("nodemailer");
const config = require("../config/config");

// Transporter to send mail
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: config.mailHost,
  port: config.mailPort, // Use 587 for TLS
  secure: true, // Use true for 465, false for 587
  auth: {
    user: config.nodemailerUser,
    pass: config.nodemailerPass,
  },
});

// Function to Send mail
const sendMail = async (to, subject, text) => {
  const mailOptions = {
    from: config.emailUser,
    to,
    subject,
    html: text,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("🚀 ~ Email sent ~ 🚀");
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

module.exports = { sendMail };
