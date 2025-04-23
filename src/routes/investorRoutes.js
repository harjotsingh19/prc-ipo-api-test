const express = require("express");
const router = express.Router();
const investorController = require("../controllers/investorController");
const { auth } = require("../middleware/auth");
const investorValidator = require("../utils/validators/investor");

router.get("/", auth, investorController.getInvestments);
router.get("/kyc", auth, investorController.getKycStatus);
router.get(
  "/investment/vesting-schedule/:id",
  auth,
  [investorValidator.validateViewVestingSchedule, investorValidator.result],
  investorController.viewVestingSchedule
);
router.get(
  "/claim-history",
  auth,
  [investorValidator.validateTokenClaimHistoryList, investorValidator.result],
  investorController.getTokenClaimHistory
);
router.get("/contribution", investorController.getTokenContribution);

module.exports = router;
