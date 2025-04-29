const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Otp = require("../models/Otp");
const RefreshTokens = require("../models/refreshToken");
const { generateOTP } = require("../utils/helper");
const { createCustomer } = require("../utils/stripeMethods");
const { jwtSign } = require("../utils/jwt");
const { httpResponse } = require("../middleware/responseHandler");
const {
  statusCode,
  message,
  status,
  otpOperations,
  emailTemplateId,
} = require("../config/constants");
const config = require("../config/config");
const { sendEmail } = require("../utils/mailManager");
const { log } = require("console");

const registerInvestor = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    const userEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: userEmail }).exec();

    let customerStripeId;

    if (existingUser) {
      if (!existingUser.isEmailVerified) {
        customerStripeId = existingUser.customerStripeId;
        await Otp.deleteMany({ userId: existingUser._id }).exec();
        await User.deleteOne({ email: userEmail }).exec();

        console.log("existingUser in if of register investor ===>");
      } else {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.userEmailAlreadyExists,
          {}
        );
      }
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (!customerStripeId) {
      const customerData = await createCustomer(userEmail);
      if (!customerData.isSuccess) {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.userNotCreatedOnStripe,
          null
        );
      }
      customerStripeId = customerData.customerId;
    }

    const user = await User.create({
      firstName,
      lastName,
      email: userEmail,
      password: hashedPassword,
      role,
      isActive: true,
      // status: status.NEW,
      customerStripeId,
    });

    let emailSent;
    if (user) {
      const otp = await generateOTP(user._id, otpOperations.emailVerification);
      emailSent = await sendEmail(
        user.email,
        emailTemplateId.emailVerification,
        {
          user_name: user.firstName,
          otp,
        }
      );
    }

    if (emailSent[0]?.statusCode != 202) {
      return httpResponse(
        res,
        statusCode.serverError,
        false,
        message.emailNotSent,
        null
      );
    }

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.otpSentSuccessfully,
      user
    );
  } catch (error) {
    console.log("error here ===>", error.message);
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { otp, userId, operation } = req.body;
    console.log("🚀 ~ verifyOTP ~ payload otp:", otp, userId, operation);

    if (operation != otpOperations.emailVerification) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidOperation
      );
    }

    console.log("🚀 ~ verifyOTP ~ payload otp:", otp);

    console.log("🚀 ~ verifyOTP ~ payload otp:", typeof otp);

    const otpData = await Otp.findOne({ userId: userId, operation })
      .populate("userId")
      .exec();

    console.log("🚀 ~ verifyOTP ~ otpData:", otpData);

    console.log("🚀 ~ verifyOTP ~ otpData:", otpData.otp);

    console.log("🚀 ~ verifyOTP ~ otpData:", typeof otpData.otp);

    if (!otpData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.otpExpired
      );
    }

    if (otpData.userId.isEmailVerified) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userAlreadyVerified
      );
    }

    if (otpData.otp !== otp) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidOtp
      );
    }

    await otpData.deleteOne({ userId, operation }).exec();

    const updateUserData = {
      updated_at: Date.now(),
    };

    switch (operation) {
      case otpOperations.emailVerification:
        updateUserData.isEmailVerified = true;
        break;
      case otpOperations.phoneVerification:
        updateUserData.isPhoneVerified = true;
        break;
      default:
        break;
    }

    const updatedUserData = await User.findOneAndUpdate(
      { _id: userId },
      {
        $set: updateUserData,
      },
      {
        new: true,
      }
    ).exec();

    const accessToken = await jwtSign(
      updatedUserData,
      config.accessTokenSecret,
      config.accessTokenExpiry
    );
    return httpResponse(res, statusCode.ok, true, message.otpVerified, {
      accessToken: accessToken,
    });
  } catch (error) {
    console.log("🚀 ~ verifyOTP ~ error:", error.message);

    return httpResponse(res, statusCode.serverError, false, error.message);
  }
};

const login = async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    const userData = await User.findOne({ email }).exec();

    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }

    const match = await bcrypt.compare(password, userData.password);

    if (!match) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidPassword
      );
    }

    if (!userData.isActive) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userNotActive
      );
    }

    if (!userData.isEmailVerified) {
      return httpResponse(res, statusCode.ok, false, message.emailNotVerified);
    }

    const accessToken = await jwtSign(
      userData,
      config.accessTokenSecret,
      config.accessTokenExpiry
    );
    const refreshToken = await jwtSign(
      userData,
      config.refreshTokenSecret,
      config.refreshTokenExpiry
    );

    const resp = {
      userId: userData._id,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: userData.role,
      status: userData.status,
      accessToken,
      refreshToken,
      deviceId,
    };

    await RefreshTokens.findOneAndUpdate(
      { userId: userData._id },
      { refreshToken: refreshToken, deviceId },
      { upsert: true, new: true }
    ).exec();

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.loginSuccessfully,
      resp
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const resendOtp = async (req, res) => {
  try {
    const { userId, operation } = req.body;
    if (operation != otpOperations.emailVerification) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidOperation
      );
    }

    const userData = await User.findById(userId).exec();

    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists,
        null
      );
    }

    if (
      userData.isEmailVerified &&
      operation == otpOperations.emailVerification
    ) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userAlreadyVerified
      );
    }
    await Otp.deleteMany({ userId: userData._id, operation }).exec();
    await Otp.deleteMany({ userId: userData._id, operation }).exec();

    const otp = await generateOTP(userData._id, operation);

    let emailSent;
    if (operation == otpOperations.emailVerification) {
      emailSent = await sendEmail(
        userData.email,
        emailTemplateId.emailVerification,
        {
          user_name: userData.firstName,
          otp,
        }
      );
    }

    if (emailSent[0]?.statusCode != 202) {
      return httpResponse(
        res,
        statusCode.serverError,
        false,
        message.emailNotSent,
        null
      );
    }

    return httpResponse(res, statusCode.ok, true, message.otpResentSuccess);
  } catch (error) {
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email }).exec();

    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000;
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    let frontendUrl;
    if (user.role === "ADMIN") {
      frontendUrl = `${config.adminFrontendUrl}/auth/reset-password/?token=${resetToken}`;
    } else if (user.role === "INVESTOR") {
      frontendUrl = `${config.userFrontendUrl}/auth/reset-password/?resetToken=${resetToken}`;
    }

    const resetLink = `${frontendUrl}`;

    await sendEmail(user.email, emailTemplateId.resetPassword, {
      resetLink,
    });
    return httpResponse(res, statusCode.ok, true, message.resetLinkSent);
  } catch (error) {
    return httpResponse(res, statusCode.serverError, false, error.message);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const token = req.params.token;
    console.log("🚀 ~ resetPassword ~ token:", token);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    }).exec();

    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidResetToken
      );
    }

    if (newPassword !== confirmPassword) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.passwordNotMatch
      );
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";

    await user.save();

    return httpResponse(res, statusCode.ok, true, message.passwordUpdated);
  } catch (error) {
    console.log("🚀 ~ resetPassword ~ error:", error.message);
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

const addWalletAddress = async (req, res) => {
  try {
    const walletAddress = req.body.walletAddress;

    const walletExists = await User.findOne({
      walletAddress: { $regex: `^${walletAddress}$`, $options: "i" },
    });

    if (walletExists) {
      const accessToken = await jwtSign(
        { _id: walletExists._id, role: walletExists.role },
        config.accessTokenSecret,
        config.accessTokenExpiry
      );
      const refreshToken = await jwtSign(
        walletExists,
        config.accessTokenSecret,
        config.refreshTokenExpiry
      );
      const user = { ...walletExists._doc };
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.walletAddressAlreadyExists,
        { user, accessToken, refreshToken }
      );
    }

    const investor = await User.create({
      walletAddress,
      role: "INVESTOR",
      isVerified: true,
      isKycVerified: false,
      isActive: true,
      status: status.NEW,
    });
    const accessToken = await jwtSign(
      investor,
      config.accessTokenSecret,
      config.accessTokenExpiry
    );
    const refreshToken = await jwtSign(
      investor,
      config.accessTokenSecret,
      config.refreshTokenExpiry
    );
    const user = { ...investor._doc };

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.walletAddressAddedSuccessfully,
      { user, accessToken, refreshToken }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    const userData = await User.findById(decoded.id).exec();
    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }
    const accessToken = await jwtSign(
      userData,
      config.accessTokenSecret,
      config.accessTokenExpiry
    );

    const responseData = {
      accessToken,
      refreshToken: refreshToken,
    };
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.tokenRefreshedSuccessfully,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  registerInvestor,
  verifyOTP,
  login,
  resendOtp,
  forgotPassword,
  resetPassword,
  addWalletAddress,
  refreshToken,
};
