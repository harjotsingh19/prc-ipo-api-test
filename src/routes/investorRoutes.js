const express = require("express");
const router = express.Router();
const investorController = require("../controllers/investorController");
const { auth } = require("../middleware/auth");
const investorValidator = require("../utils/validators/investor");

router.get("/", auth, investorController.getInvestments);

router.get("/contribution", auth, investorController.getTokenContribution);

module.exports = router;
