const { check, validationResult } = require("express-validator");
const { httpResponse } = require("../../middleware/responseHandler");
const { statusCode } = require("../../config/constants");
const { param } = require("express-validator");

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

exports.handleInvestorQuery = (req, res, next) => {
  if (req.query.investorId) {
    req.query.page = "1";
    req.query.pageSize = "10";
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

exports.validateAirdropList = [
  check("id").trim().notEmpty().bail().withMessage("Sale ID is required."),
];

exports.validateWhitelistAddressList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];

exports.validateTokenTransferStatusUpdate = [
  param("id")
    .trim()
    .notEmpty()
    .withMessage("Sale ID (id) is required in the URL.")
    .bail()
    .isString()
    .withMessage("Sale ID must be a string."),
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
  check("name").trim().notEmpty().bail().withMessage("sale name is required."),
  check("startDate")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("startDate is required."),
  check("endDate").trim().notEmpty().bail().withMessage("endDate is required."),
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

exports.commonParamIdValidate = [
  param("id").trim().notEmpty().bail().withMessage("Investor ID is required."),
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

exports.validateUpdateSalesAirDropTransactions = [
  check("userIds")
    .isArray({ min: 1 })
    .withMessage("userIds must be a non-empty array.")
    .custom((userIds) => {
      if (!userIds.every((id) => /^[a-fA-F0-9]{24}$/.test(id))) {
        throw new Error("Each userId must be a valid MongoDB ObjectId.");
      }
      return true;
    }),
  check("saleId")
    .trim()
    .notEmpty()
    .withMessage("saleId is required.")
    .matches(/^[a-fA-F0-9]{24}$/)
    .withMessage("saleId must be a valid MongoDB ObjectId."),
];
