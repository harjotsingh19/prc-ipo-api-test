const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const saleController = require("../controllers/saleController");
const { auth, isAdmin } = require("../middleware/auth");
const adminValidator = require("../utils/validators/admin");
const saleValidator = require("../utils/validators/sale");

router.get(
  "/",
  auth,
  [adminValidator.validateSaleList, adminValidator.result],
  adminController.getSales
);

router.get(
  "/:id",
  auth,
  [adminValidator.commonIdValidate, adminValidator.result],
  adminController.getSale
);

router.post(
  "/purchase",
  auth,
  [saleValidator.validatePurchaseToken, saleValidator.result],
  saleController.purchaseToken
);

module.exports = router;
