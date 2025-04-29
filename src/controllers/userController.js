const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const {
  status,
  statusCode,
  message,
  otpOperations,
  emailTemplateId,
} = require("../config/constants");
const UserActivity = require("../models/UserActivity");
const { isCurrentUser } = require("../utils/helper");
const RefreshTokens = require("../models/refreshToken");
const { generateOTP } = require("../utils/helper");
const { sendEmail } = require("../utils/mailManager");

const updateProfile = async (req, res) => {
  try {
    const isCurrentUserLogin = await isCurrentUser(req.data.id, req.params.id);
    if (!isCurrentUserLogin) {
      return httpResponse(
        res,
        statusCode.unAuthorized,
        false,
        message.unauthorizedUser,
        {}
      );
    }
    const { firstName, lastName, password } = req.body;
    const email = req.body?.email?.toLowerCase();

    const user = await User.findById(req.params.id).exec();
    const userData = {
      firstName: firstName || user.firstName,
      lastName: lastName || user.lastName,
    };
    if (email) {
      const isEmailExist = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      }).exec();
      if (isEmailExist) {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.userEmailAlreadyExists,
          {}
        );
      }
      userData.email = email;
      userData.isEmailVerified =
        email == user.email ? user.isEmailVerified : false;
      if (email != user.email) {
        userData.status = status.EMAIL_VERIFICATION_PENDING;
      }
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(password, salt);
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, userData, {
      new: true,
    }).exec();
    const updatedUserData = { ...updatedUser._doc };
    delete updatedUserData.password;
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.profileUpdateSuccess,
      updatedUserData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const addUserActivity = async (req, res) => {
  try {
    const { userId, timestamp, from, message } = req.body;
    const userActivityData = { userId, timestamp, from, message };
    await UserActivity.create(userActivityData);
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.userActivityRecorded,
      {}
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const generateBase32Secret = async () => {
  const secretKey = speakeasy.generateSecret({ length: 32 });
  return secretKey;
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.data.id).exec();
    if (user) {
      const userData = { ...user._doc };
      delete userData.password;
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.fetchProfileSuccess,
        userData
      );
    }
    return httpResponse(
      res,
      statusCode.badRequest,
      false,
      message.userDoesnotExists,
      {}
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const logout = async (req, res) => {
  try {
    await UserActivity.create({
      userId: req.data.id,
      timestamp: Date.now(),
      from: "Logout",
      message: message.logoutSuccess,
    });
    await RefreshTokens.deleteMany({
      userId: req.data.id,
      deviceId: req.body.deviceId,
    });
    return httpResponse(res, statusCode.ok, true, message.logoutSuccess, {});
  } catch (error) {
    return httpResponse(res, statusCode.serverError, false, error.message);
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const userData = await User.findById(req.data.id);
    const match = await bcrypt.compare(currentPassword, userData.password);
    if (!match) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.wrongPasswd
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
    const password = await bcrypt.hash(newPassword, salt);
    await User.updateOne({ _id: userData._id }, { password }).exec();

    return httpResponse(res, statusCode.ok, true, message.passwordUpdated, {});
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const addWallet = async (req, res) => {
  try {
    const { walletAddress } = req.body;
    const userData = await User.findById(req.data.id);

    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }

    const checkUserWallet = await User.findOne({
      walletAddress: walletAddress.toLowerCase(),
    });

    if (checkUserWallet) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.walletAddressAlreadyExists
      );
    }

    if (userData?.walletAddress) {
      const otp = await generateOTP(userData._id, otpOperations.updateWallet);

      await sendEmail(userData.email, emailTemplateId.updateWallet, {
        user_name: userData.firstName,
        otp,
      });

      userData.tempWalletAddress = walletAddress.toLowerCase();
      await userData.save();

      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.otpSentSuccessfully
      );
    }

    const addWalletData = await User.updateOne(
      { _id: userData._id },
      { walletAddress: walletAddress.toLowerCase() }
    );

    if (addWalletData) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.walletAddressAddedSuccessfully,
        {}
      );
    }

    return httpResponse(
      res,
      statusCode.badRequest,
      true,
      message.errorAddingWallet,
      {}
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  updateProfile,
  addUserActivity,
  getUserProfile,
  logout,
  changePassword,
  addWallet,
};
