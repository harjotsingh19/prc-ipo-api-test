const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { statusCode, message, roles } = require("../config/constants");
const { httpResponse } = require("../middleware/responseHandler");
const rateLimit = require("express-rate-limit");

const auth = (req, res, next) => {
  try {
    let token = req.headers.authorization;
    console.log("🚀 ~ token:", token);
    if (token == "") {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.enterAccessToken
      );
    } else {
      let accesstoken = token.split(" ");
      let decoded = jwt.verify(accesstoken[1], config.accessTokenSecret);
      console.log("🚀 ~ auth ~ decoded:", decoded);
      req.data = decoded;
      console.log("🚀 ~ decoded:", decoded);
      next();
    }
  } catch (err) {
    console.log(err);
    return httpResponse(
      res,
      statusCode.unAuthorized,
      false,
      message.invalidToken
    );
  }
};

const isAdmin = (req, res, next) => {
  try {
    const userRole = req.data.role;

    if (userRole !== roles.ADMIN) {
      return httpResponse(
        res,
        statusCode.unAuthorized,
        false,
        message.userIsNotAdmin
      );
    }
    next();
  } catch (error) {
    return httpResponse(
      res,
      statusCode.unAuthorized,
      false,
      message.userIsNotAdmin
    );
  }
};

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 3,
  handler: (req, res, next) => {
    return httpResponse(
      res,
      statusCode.tooManyRequest,
      false,
      message.tooManyRequests
    );
  },
});

module.exports = { auth, isAdmin, limiter };
