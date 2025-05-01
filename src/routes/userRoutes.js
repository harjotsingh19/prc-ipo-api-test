const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth } = require("../middleware/auth");
const userValidator = require("../utils/validators/user");
const { limiter } = require("../middleware/auth");

router.patch(
  "/profile/:id",
  auth,
  [userValidator.validateUpdateProfile, userValidator.result],
  userController.updateProfile
);
router.post("/activity", userController.addUserActivity);

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

router.put(
  "/wallet",
  auth,
  [userValidator.validateAddWallet, userValidator.result],
  limiter,
  userController.addWallet
);

module.exports = router;
