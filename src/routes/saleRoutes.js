const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const auth = require("../middleware/auth");
const { isAmin} = require("../utils/helper");  
const adminValidator = require("../utils/validators/admin");

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

module.exports = router;
