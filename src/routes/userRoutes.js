const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middleware/auth");
const userValidator = require("../utils/validators/user");

router.patch(
  "/profile/:id",
  auth,
  [userValidator.validateUpdateProfile, userValidator.result],
  userController.updateProfile
);
router.post("/activity", userController.addUserActivity);
router.patch("/enable-mfa/:id", auth, userController.enableMFA);
router.post("/verify-mfa/:id", userController.verifyMFA);
router.get("/me", auth, userController.getUserProfile);
router.post(
  "/logout",
  auth,
  [userValidator.validateLogout, userValidator.result],
  userController.logout
);
router.put(
  "/change-password",
  auth,
  [userValidator.validateChangePassword, userValidator.result],
  userController.changePassword
);

module.exports = router;
