const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { status, statusCode, message } = require("../config/constants");
const UserActivity = require("../models/UserActivity");
const { isCurrentUser } = require("../utils/helper");
const PrivateAddress = require("../models/PrivateAddress");
const RefreshTokens = require("../models/refreshToken");

// update login user profile
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

    console.log("🚀 ~ updateProfile ~ email:", email);
    const user = await User.findById(req.params.id);
    console.log("🚀 ~ updateProfile ~ req.body:", req.body);
    const userData = {
      firstName: firstName.toLowerCase() || user.firstName,
      lastName: lastName.toLowerCase() || user.lastName,
    };
    if (email) {
      const isEmailExist = await User.findOne({
        email,
        _id: { $ne: req.params.id },
      });
      if (isEmailExist) {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.emailAlreadyExist,
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
    });
    const updatedUserData = { ...updatedUser._doc };
    delete updatedUserData.password;
    console.log("🚀 ~ updateProfile ~ updatedUserData:", updatedUserData);
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.profileUpdateSuccess,
      updatedUserData
    );
  } catch (error) {
    console.log("error here ===>", error);
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
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const generateBase32Secret = async () => {
  const secretKey = speakeasy.generateSecret({ length: 32 });
  return secretKey;
};

const enableMFA = async (req, res) => {
  try {
    if (req.data.id && req.data.id.toString() == req.params.id.toString()) {
      const secretKey = await generateBase32Secret();
      await User.findByIdAndUpdate(
        req.params.id,
        { mfaSecret: secretKey.ascii },
        { new: true }
      );
      const otpauth_url = speakeasy.otpauthURL({
        secret: secretKey.ascii,
        label: "Security Code",
        algorithm: "sha512",
      });

      const qrCodeDataURL = await QRCode.toDataURL(otpauth_url);
      return httpResponse(res, statusCode.ok, true, message.mfaEnableSuccess, {
        qrCodeDataURL,
      });
    }
    return httpResponse(
      res,
      statusCode.unAuthorized,
      false,
      message.unauthorizedUser,
      {}
    );
  } catch (error) {
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const verifyMFA = async (req, res) => {
  try {
    const { otp } = req.body;
    const { id } = req.params;
    const user = await User.findById(id);

    const isVerified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      token: otp,
      label: "Security Code",
      algorithm: "sha512",
    });

    if (isVerified) {
      await User.findByIdAndUpdate(req.params.id, { isMfaEnabled: true });
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.mfaVerifiedSuccess,
        {}
      );
    }
    return httpResponse(
      res,
      statusCode.badRequest,
      false,
      message.otpExpired,
      {}
    );
  } catch (error) {
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.data.id);
    console.log("🚀 ~ getUserProfile ~ user:", user);
    if (user) {
      const userData = { ...user._doc };
      delete userData.password;
      console.log("🚀 ~ getUserProfile ~ userData:", userData);
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
    console.log("error here ===>", error);
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
    await RefreshTokens.deleteOne({
      userId: req.data.id,
      deviceId: req.body.deviceId,
    });
    return httpResponse(res, statusCode.ok, true, message.logoutSuccess, {});
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
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

    // Validate passwords match
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
    await User.updateOne({ _id: userData._id }, { password });

    return httpResponse(res, statusCode.ok, true, message.passwordUpdated, {});
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  updateProfile,
  addUserActivity,
  enableMFA,
  verifyMFA,
  getUserProfile,
  logout,
  changePassword,
};
