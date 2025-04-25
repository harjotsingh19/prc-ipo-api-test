const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth, isAdmin } = require("../middleware/auth");
const adminValidator = require("../utils/validators/admin");

router.get(
  "/investors",
  auth,
  [adminValidator.validateInvestorsList, adminValidator.result],
  adminController.getInvestors
);
router.get("/investments", auth, adminController.getAllInvestments);

router.get(
  "/investments/:id", // Define the route with a parameter for transaction ID
  auth, // Apply authentication middleware
  adminController.getInvestmentDetails // Call the getTransactionDetails function in the controller
);
// router.post("/sale/create", auth, adminController.createSale)

router.post(
  "/sales",
  auth,
  isAdmin,
  [adminValidator.validateCreateSale, adminValidator.result],
  adminController.createSale
);

router.get(
  "/sales",
  auth,
  [adminValidator.validateSaleList, adminValidator.result],
  adminController.getSales
);
// router.post("/setAdminAddress", auth, adminController.setAdminAddress);
router.get("/token", adminController.getTokenDetails);
router.post("/token", adminController.createToken);
router.get(
  "/address-whitelist",
  auth,
  [adminValidator.validateWhitelistAddressList, adminValidator.result],
  adminController.getAllAddressWhitelist
);
router.get(
  "/investors-investments/:walletAddress",
  auth,
  [adminValidator.validateInvestorsInvestmentsList, adminValidator.result],
  adminController.getOneInvestorAllInvestments
);

router.get(
  "/sale-statistics",
  auth,
  [adminValidator.validateStatisticsList, adminValidator.result],
  adminController.getSaleStatistics
);
router.get("/user-analytics/:userId", auth, adminController.getUserAnalytics);
router.get("/dashboard", auth, isAdmin, adminController.dashboard);
router.get(
  "/distribution-analytics/:saleId",
  auth,
  adminController.getDistributionAnalytics
);
router.patch("/investorKyc/:id", auth, adminController.updateInvestorKycStatus);
router.get(
  "/address-blacklist",
  auth,
  [adminValidator.validateWhitelistAddressList, adminValidator.result],
  adminController.getAllAddressBlacklist
);
router.patch(
  "/user-status/:id",
  auth,
  [adminValidator.validateUserStatus, adminValidator.result],
  adminController.updateUserStatus
);

module.exports = router;
