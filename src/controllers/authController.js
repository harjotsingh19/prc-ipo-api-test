const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Otp = require("../models/Otp");
const RefreshTokens = require("../models/refreshToken");
const { generateOTP } = require("../utils/helper");
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
// const { createApplicant } = require("./kycController")
const { sendEmail } = require("../utils/mailManager");

// To register an investor
const registerInvestor = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.userAlreadyExists,
        null
      );
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const statusHistory = {
      status: status.NEW,
      timestamp: Date.now(),
      reason: "",
    };

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
      isActive: true,
      status: status.NEW,
      statusHistory: statusHistory,
    });

    if (user) {
      const otp = await generateOTP(user._id, otpOperations.emailVerification);
      await sendEmail(user.email, emailTemplateId.emailVerification, {
        user_name: user.firstName,
        otp,
      });
    }

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.otpSentSuccessfully,
      user
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

// API to verify the OTP
const verifyOTP = async (req, res) => {
  try {
    const { otp, userId, operation } = req.body;
    console.log("🚀 ~ verifyOTP ~ req.body:", req.body);

    const otpData = await Otp.findOne({ userId: userId, operation }).populate(
      "userId"
    );
    console.log("🚀 ~ verifyOTP ~ otpData:", otpData);
    if (!otpData) {
      return httpResponse(res, statusCode.errorPage, false, message.otpExpired);
    }

    if (otpData.userId.isEmailVerified) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.userAlreadyVerified
      );
    }

    if (otpData.otp !== otp) {
      return httpResponse(res, statusCode.errorPage, false, message.invalidOtp);
    }

    // delete otp data
    await otpData.deleteOne({ userId, operation });

    const statusHistory = { timestamp: Date.now(), reason: "" };
    const updateUserData = {
      updated_at: Date.now(),
    };

    switch (operation) {
      case otpOperations.emailVerification:
        updateUserData.isEmailVerified = true;
        updateUserData.status = status.EMAIL_VERIFIED;
        statusHistory.status = status.EMAIL_VERIFIED;
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
        $push: { statusHistory: statusHistory },
        $set: updateUserData,
      },
      {
        new: true,
      }
    );

    const accessToken = await jwtSign(
      updatedUserData,
      config.accessTokenSecret,
      config.accessTokenExpiry
    );
    return httpResponse(res, statusCode.ok, true, message.otpVerified, {
      accessToken: accessToken,
    });
  } catch (error) {
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

// Login API for all users
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const userData = await User.findOne({ email });

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
        message.wrongPassword
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
    };

    const refreshTokenData = {
      userId: userData._id,
      refreshToken: refreshToken,
    };
    const storeRefreshToken = await RefreshTokens.findOneAndUpdate(
      { userId: userData._id },
      { refreshToken: refreshToken },
      { upsert: true, new: true }
    );
    console.log("🚀 ~ login ~ storeRefreshToken:", storeRefreshToken);

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

// Resend OTP
const resendOtp = async (req, res) => {
  try {
    const { userId, operation } = req.body;
    const userData = await User.findById(userId);

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

    const otp = await generateOTP(userData._id, operation);

    if (operation == otpOperations.emailVerification) {
      await sendEmail(userData.email, emailTemplateId.emailVerification, {
        user_name: userData.name,
        otp,
      });
    }

    return httpResponse(res, statusCode.ok, true, message.otpResentSuccess);
  } catch (error) {
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

// Forgot Password API
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // Token valid for 1 hour
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    let frontendUrl;
    if (user.role !== "ADMIN") {
      frontendUrl = config.userFrontendUrl;
    } else {
      frontendUrl = config.adminFrontendUrl;
    }

    console.log("🚀 ~ forgotPassword ~ frontendUrl:", frontendUrl);

    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    await sendEmail(user.email, emailTemplateId.resetPassword, {
      resetLink,
    });
    return httpResponse(res, statusCode.ok, true, message.resetLinkSent);
  } catch (error) {
    return httpResponse(res, statusCode.serverError, false, error.message);
  }
};

// Reset Password API
const resetPassword = async (req, res) => {
  try {
    const { newPassword, confirmPassword } = req.body;
    const token = req.params.token;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidResetToken
      );
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.passwordNotMatch
      );
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear the reset token and expiry
    user.resetPasswordToken = "";
    user.resetPasswordExpires = "";

    await user.save();

    return httpResponse(res, statusCode.ok, true, message.passwordUpdated);
  } catch (error) {
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

const addWalletAddress = async (req, res) => {
  try {
    console.log("🚀 ~ addWalletAddress ~ API");
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
    const statusHistory = {
      status: status.NEW,
      timestamp: Date.now(),
      reason: "",
    };

    const investor = await User.create({
      walletAddress,
      role: "INVESTOR",
      isVerified: true,
      isKycVerified: false,
      isActive: true,
      status: status.NEW,
      statusHistory: statusHistory,
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
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, config.refreshTokenSecret);
    console.log("🚀 ~ refreshToken ~ decoded:", decoded);
    const userData = await User.findById(decoded.id);
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
    const newRefreshToken = await jwtSign(
      userData,
      config.refreshTokenSecret,
      config.refreshTokenExpiry
    );

    const responseData = {
      accessToken,
      refreshToken: newRefreshToken,
    };
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.loginSuccessfully,
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
