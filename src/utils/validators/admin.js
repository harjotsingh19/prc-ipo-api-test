const { check, validationResult } = require("express-validator");
const { httpResponse } = require("../../middleware/responseHandler");
const { statusCode } = require("../../config/constants");

exports.result = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return httpResponse(
      res,
      statusCode.badRequest,
      false,
      errors.array()[0].msg,
      []
    );
  }
  next();
};

exports.validateInvestorsList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateInvestorsInvestmentsList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
  check("walletAddress")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Wallet address is required."),
];

exports.validateSaleList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateWhitelistAddressList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateInvestorKYCList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateStatisticsList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateCreateSale = [
  check("name").trim().notEmpty().bail().withMessage("saleId is required."),
  check("startTime")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("startTime is required."),
  check("endTime").trim().notEmpty().bail().withMessage("endTime is required."),
  check("tokenPrice")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("tokenPrice is required."),
];

exports.validateInvestorOnchainId = [
  check("onchainId")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Onchain id is required."),
];

exports.validateClaimTokenHistoryList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.commonIdValidate = [
  check("id").trim().notEmpty().bail().withMessage("Id is required."),
];

exports.validateUserStatus = [
  check("isBlocked")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("isBlocked is required.")
    .isBoolean()
    .withMessage("isBlocked must be a boolean value"),
];
