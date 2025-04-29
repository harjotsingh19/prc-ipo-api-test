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
  try {
    const response = await sendGridMail.send(emailBody);
    return response;
  } catch (e) {
    return e;
  }
};
