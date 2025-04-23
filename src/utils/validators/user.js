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

exports.validateUpdateProfile = [
  check("firstName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("First name is required.")
    .isLength({ min: 2 })
    .withMessage("First name must be at least 2 characters long"),

  check("lastName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Last name is required.")
    .isLength({ min: 2 })
    .withMessage("Last name must be at least 2 characters long"),

  check("email")
    .optional()
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Email is required.")
    .isEmail()
    .bail()
    .withMessage("enter a valid email address"),

  check("mobile")
    .optional()
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Mobile is required.")
    .isLength({ min: 10, max: 13 })
    .bail()
    .withMessage("mobile number should be of 10 digits")
    .isNumeric()
    .bail()
    .withMessage("Mobile can contain digits only"),

  check("password")
    .optional()
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Password is empty")
    .isLength({ min: 8 })
    .bail()
    .withMessage("Password is too small, at least 8 characters required")
    .matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
    .bail()
    .withMessage("Enter a strong password."),
];

exports.validateChangePassword = [
  check("currentPassword")
    .trim()
    .notEmpty()
    .bail()
    .withMessage("Current password is required."),
  check("newPassword")
    .trim()
    .not()
    .isEmpty()
    .bail()
    .withMessage("New Password is required")
    .isLength({ min: 8 })
    .bail()
    .withMessage("Pasword is too small,atleast 8 characters required")
    .matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
    .bail()
    .withMessage("Enter a strong password"),
  check("confirmPassword")
    .trim()
    .not()
    .isEmpty()
    .bail()
    .withMessage("Confirm password is required"),
];
