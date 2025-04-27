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

exports.validatePurchaseToken = [
  check("quantity")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Quantity is required."),
  check("saleId").trim().notEmpty().bail().withMessage("Sale Id is required."),
  check("amountPaid")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Amount Paid is required.")
    .matches(/^\d+(\.\d{1,5})?$/)
    .withMessage(
      "Amount Paid must be a valid number with up to 5 decimal places."
    ),
];
