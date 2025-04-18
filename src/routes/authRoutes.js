const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController.js");
// const authValidator = require('../validators/userValidator.js');
const authValidator = require("../utils/validators/auth");
const validator = new authValidator();
const upload = require("../utils/multer");
const docUpload = upload.fields([
  { name: "idProofFront", maxCount: 1 },
  { name: "idProofBack", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
]);

router.post(
  "/register",
  validator.validateUserSignup(),
  validator.result,
  authController.registerInvestor
);
router.post(
  "/verifyOtp",
  validator.validateOtp(),
  validator.result,
  authController.verifyOTP
);

// router.post("/verifyOtp", authController.verifyOTP);
router.post(
  "/login",
  validator.validateUserLogin(),
  validator.result,
  authController.login
);
router.post(
  "/resendOtp",
  validator.validateResendOtp(),
  validator.result,
  authController.resendOtp
);
router.post(
  "/forgotPassword",
  validator.validateForgotPassword(),
  validator.result,
  authController.forgotPassword
);
router.put(
  "/resetPassword/:token",
  validator.validateResetPassword(),
  validator.result,
  authController.resetPassword
);
// router.post("/addWalletAddress", docUpload, authController.addWalletAddress);
router.post(
  "/refresh-token",
  validator.validateRefreshToken(),
  validator.result,
  authController.refreshToken
);

module.exports = router;
