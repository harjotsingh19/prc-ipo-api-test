const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController.js');
const upload = require("../utils/multer")
const docUpload = upload.fields([{ name: 'idProofFront', maxCount: 1 }, { name: 'idProofBack', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]);

router.post("/register", authController.registerInvestor);
router.post("/verifyOtp", authController.verifyOTP);
router.post("/login", authController.login);
router.post("/resendOtp", authController.resendOtp);
router.post("/forgotPassword", authController.forgotPassword);
router.put("/resetPassword/:token", authController.resetPassword);
router.post("/addWalletAddress", docUpload, authController.addWalletAddress);
router.post("/refresh-token", authController.refreshToken);

module.exports = router;


