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

exports.validateViewVestingSchedule = [
  check("id")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Investment id is required."),
];

exports.validateTokenClaimHistoryList = [
  check("page").trim().notEmpty().bail().withMessage("Page is required."),
  check("pageSize")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Page size is required."),
];
