const { validationResult, check } = require("express-validator");
const User = require("../../models/User.js");

const response = require("../../middleware/responseHandler.js");
const {
  message,
  statusCode,
  responseStatus,
} = require("../../config/constants.js");
const { logger } = require("ethers");

class Validator {
  validateUserSignup() {
    return [
      check("firstName")
        .trim()
        .notEmpty()
        .withMessage("First name is required.")
        .isLength({ min: 2 })
        .withMessage("First name must be at least 2 characters long."),

      check("lastName")
        .trim()
        .notEmpty()
        .withMessage("Last name is required.")
        .isLength({ min: 2 })
        .withMessage("Last name must be at least 2 characters long."),

      check("email")
        .trim()
        .notEmpty()
        .bail()
        .withMessage("Email is required.")
        .isEmail()
        .bail()
        .withMessage("enter a valid email address"),
      // .custom(async (value) => {
      //   console.log("🚀 ~ Validator ~ .custom ~ value:", value)
      //   const user = await User.findOne({
      //     email: value.toLowerCase(),
      //     isEmailVerified: true,
      //   });
      //   if (user) {
      //     throw new Error(message.emailAlreadyExist);
      //   }
      //   console.log("🚀 ~ Validator ~ .custom email ~ user:");
      // }),

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
        .withMessage("Mobile can contain digits only")
        .custom(async (value) => {
          const user = await User.findOne({
            mobile: value,
            isMobileVerified: true,
          }).exec();
          if (user) {
            throw new Error(message.mobileAlreadyExists);
          }
        }),
      check("password")
        .trim()
        .not()
        .isEmpty()
        .bail()
        .withMessage("password is empty")
        .isLength({ min: 8 })
        .bail()
        .withMessage("Pasword is too small,atleast 8 characters required")
        .matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
        .bail()
        .withMessage("Enter a strong password"),
      check("role")
        .notEmpty()
        .withMessage("Role is required.")
        .isIn(["ADMIN", "INVESTOR"])
        .withMessage("Role must be either 'ADMIN' or 'INVESTOR'"),
    ];
  }

  validateResetPassword() {
    return [
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
  }

  validateOtp() {
    return [
      check("userId")
        .trim()
        .notEmpty()
        .bail()
        .withMessage("userId is required."),
      check("otp").trim().notEmpty().bail().withMessage("OTP is required."),
      check("operation")
        .notEmpty()
        .withMessage("operation is required.")
        .custom((value) => {
          if (typeof value !== "number") {
            throw new Error("Operation must be a number.");
          }
          if (!Number.isInteger(value)) {
            throw new Error("Operation must be an integer.");
          }
          return true;
        }),
    ];
  }

  validateResendOtp() {
    return [
      check("userId")
        .trim()
        .notEmpty()
        .bail()
        .withMessage("userId is required.")
        .custom(async (value, { req }) => {
          const user = await User.findOne({ _id: value }).exec();
          if (!user) {
            throw new Error(message.noUserFound);
          }
          req.email = user?.email ?? null;
          req.userIsVerified = user?.isEmailVerified;
        }),
      check("operation")
        .notEmpty()
        .withMessage("operation is required.")
        .custom((value) => {
          if (typeof value !== "number") {
            throw new Error("Operation must be a number.");
          }
          if (!Number.isInteger(value)) {
            throw new Error("Operation must be an integer.");
          }
          return true;
        }),
    ];
  }

  validateUserLogin() {
    return [
      check("password").trim().notEmpty().withMessage("Password is required."),
      check("email")
        .trim()
        .notEmpty()
        .bail()
        .withMessage("Email is required.")
        .isEmail()
        .bail()
        .withMessage("Please enter valid email.")
        // .custom(async (value, { req }) => {
        //   const user = await User.findOne({
        //     email: value.toLowerCase(),
        //   });
        //   console.log("🚀 ~ Validator ~ .custom email ~ user:", user);
        //   if (!user || user?.isDeleted === true) {
        //     console.log(
        //       "🚀 ~ Validator ~ .custom ~ user?.isDeleted:",
        //       user?.isDeleted
        //     );
        //     throw new Error(message.userNotRegistered);
        //   }
        //   if (!user?.isEmailVerified) {
        //     console.log(
        //       "🚀 ~ Validator ~ .custom ~ user?.isEmailVerified:",
        //       user?.isEmailVerified
        //     );
        //     throw new Error(message.userNotVerified);
        //   }
        //   const checkPw = await passwordManager.comparePassword({
        //     plainPassword: req.body.password,
        //     hashPassword: user.password,
        //   });
        //   console.log("🚀 ~ Validator ~ .custom ~ checkPw:", checkPw);
        //   if (!checkPw) {
        //     throw new Error(message.incorrectEmailOrPassword);
        //   }
        // })
        .bail(),
      check("mobile")
        .optional()
        .trim()
        .notEmpty()
        .bail()
        .withMessage("Mobile is required.")
        .isLength({ min: 10 })
        .bail()
        .withMessage("mobile number should be of 10 digits")
        .isNumeric()
        .bail()
        .withMessage("Mobile can contain digits only")
        .custom(async (value, { req }) => {
          const user = await User.findOne({
            mobile: value,
          }).exec();
          console.log("🚀 ~ Validator ~ .custom mobile ~ user:", user);
          if (!user) {
            throw new Error(message.noUserFound);
          } else if (!user?.isMobileVerified) {
            console.log(
              "🚀 ~ Validator ~ .custom ~ user?.isMobileVerified:",
              user?.isMobileVerified
            );
            throw new Error(message.userNotVerified);
          }
          const checkPw = await passwordManager.comparePassword({
            plainPassword: req.body.password,
            hashPassword: user.password,
          });
          if (!checkPw) {
            throw new Error(message.incorrectMobileOrPassword);
          }
        }),
      check("deviceId").trim().notEmpty().withMessage("deviceId is required."),
    ];
  }

  validateForgotPassword() {
    return [
      check("email")
        .trim()
        .notEmpty()
        .bail()
        .withMessage("Email is required.")
        .isEmail()
        .bail()
        .withMessage("Please enter valid email.")
        // .custom(async (value) => {
        //   const user = await User.findOne({
        //     email: value.toLowerCase(),
        //   });
        //   if (!user) {
        //     throw new Error(message.emailNotExist);
        //   }
        //   if (!user.isEmailVerified) {
        //     throw new Error(message.userNotVerified);
        //   }
        // })
        .bail(),
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
        .withMessage("Mobile can contain digits only")
        .custom(async (value) => {
          const user = await User.findOne({
            mobile: value,
          }).exec();
          if (!user) {
            throw new Error(message.mobileNotFound);
          } else if (!user?.isMobileVerified) {
            throw new Error(message.userNotVerified);
          }
        }),
    ];
  }

  // validateResetPassword() {
  //   return [
  //     check("password")
  //       .trim()
  //       .not()
  //       .isEmpty()
  //       .bail()
  //       .withMessage("password is empty")
  //       .isLength({ min: 10 })
  //       .bail()
  //       .withMessage("Pasword is too small")
  //       .matches(/^(?=.*\d)(?=.*[!@#$%^&*])(?=.*[a-z])(?=.*[A-Z]).{8,}$/)
  //       .bail()
  //       .withMessage("Enter a strong password"),
  //     check("userId")
  //       .trim()
  //       .notEmpty()
  //       .withMessage("User Id is required.")
  //       .custom(async (value) => {
  //         if (value) {
  //           const user = await User.findOne({ _id: value }).exec();
  //           if (!user) {
  //             throw new Error(message.noUserFound);
  //           }
  //           if (!user.isEmailVerified && !user.isMobileVerified) {
  //             throw new Error(message.userNotVerified);
  //           }
  //         }
  //       }),
  //     check("otp").trim().notEmpty().bail().withMessage("OTP is required."),
  //   ];
  // }

  validateRefreshToken() {
    return [
      check("refreshToken")
        .trim()
        .notEmpty()
        .withMessage("Refresh token is required."),
    ];
  }

  validateVerify2Fa() {
    return [
      check("_2faToken")
        .trim()
        .notEmpty()
        .withMessage("_2faToken is required."),
      check("sessionToken")
        .trim()
        .notEmpty()
        .withMessage("sessionToken is required."),
    ];
  }

  result(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("errors are not empty ");

      errors.array().forEach((err) => console.log("err", err));
      return response.httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.validationError,
        errors.array()
      );
    } else {
      next();
    }
  }
}

module.exports = Validator;
