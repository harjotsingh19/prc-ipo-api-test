const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { auth, isAdmin } = require("../middleware/auth");
const adminValidator = require("../utils/validators/admin");

router.get(
  "/investors",
  // auth,
  // isAdmin,
  [
    adminValidator.handleInvestorQuery,
    adminValidator.validateInvestorsList,
    adminValidator.result,
  ],
  adminController.getInvestors
);

router.get(
  "/investor/:id",
  auth,
  isAdmin,
  adminValidator.commonParamIdValidate,
  adminValidator.result,
  adminController.getInvestorById
);

router.get("/investments", auth, adminController.getAllInvestments);

router.get("/investments/:id", auth, adminController.getInvestmentDetails);

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

router.put(
  "/sales/airdrop/:id",
  // auth,
  // isAdmin,

  [adminValidator.commonIdValidate, adminValidator.result],
  adminController.getSalesAirDropTransactions
);

router.get(
  "/airdrop",
  // auth,
  // isAdmin,
  [adminValidator.validateAirdropList, adminValidator.result],
  adminController.getSalesAirDropUsers
);

router.put(
  "/airdrop/:id",
  // auth,
  // isAdmin,
  [adminValidator.validateTokenTransferStatusUpdate, adminValidator.result],
  adminController.updateTokenTransferStatus
);

router.get(
  "/sale-statistics",
  auth,
  [adminValidator.validateStatisticsList, adminValidator.result],
  adminController.getSaleStatistics
);
router.get("/dashboard", auth, isAdmin, adminController.dashboard);
router.patch(
  "/user-status/:id",
  auth,
  [adminValidator.validateUserStatus, adminValidator.result],
  adminController.updateUserStatus
);

router.get("/transactions", auth, isAdmin, adminController.transactions);

router.get(
  "/download-investments",
  auth,
  isAdmin,
  adminController.downloadInvestments
);

module.exports = router;
