const sendGridMail = require("@sendgrid/mail");
const config = require("../config/config");

/* Setting Up Send Grid Api key */
exports.setUpSendGrid = () => {
  sendGridMail.setApiKey(config.sendGridApiKey);
};

/* For Sending Email With Custom Template */
exports.sendEmail = async (recipient, templateId, template_data) => {
  console.log("🚀 ~ exports.sendEmail= ~ template_data:", template_data);
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
    console.log("🚀 ~ exports.sendEmail= ~ error:", e.response.body);

    return e;
  }
};

exports.sendEmailToMultipleUsers = async (templateId, mailData) => {
  const emailBody = {
    from: config.sendGridEmailAddress,
    templateId,
    personalizations: mailData,
  };

  try {
    const response = await sendGridMail.send(emailBody);
    return response;
  } catch (e) {
    return e;
  }
};
