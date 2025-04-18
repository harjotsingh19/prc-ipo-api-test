const jwt = require("jsonwebtoken");
const config = require("../config/config");
const { statusCode, message, roles } = require("../config/constants");
const { httpResponse } = require("../middleware/responseHandler");

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
      req.data = decoded;
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

const isAdmin = (req, res) => {
  try {
    const userRole = req.data.role;

    if (userRole !== roles.ADMIN) {
      throw new Error("Only Admin Can Access");
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

module.exports = { auth, isAdmin };
