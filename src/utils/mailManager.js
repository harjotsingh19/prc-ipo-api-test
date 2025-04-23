const sendGridMail = require("@sendgrid/mail");
const config = require("../config/config");

/* Setting Up Send Grid Api key */
exports.setUpSendGrid = () => {
  sendGridMail.setApiKey(config.sendGridApiKey);
};

/* For Sending Email With Custom Template */
exports.sendEmail = async (recipient, templateId, template_data) => {
  const emailBody = {
    to: recipient,
    from: config.sendGridEmailAddress,
    templateId,
    dynamicTemplateData: template_data,
  };
  console.log("🚀 ~ exports.sendEmail= ~ emailBody:", emailBody);
  try {
    const response = await sendGridMail.send(emailBody);
    return response;
  } catch (e) {
    console.log("🚀 ~ exports.sendEmail= ~ e:", e.response.body);

    return e;
  }
};
