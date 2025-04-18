const User = require("../models/User");
const Sale = require("../models/Sale");
const { httpResponse } = require("../middleware/responseHandler");
const { createSession } = require("../utils/stripeMethods");
const { statusCode, message } = require("../config/constants");
const { default: mongoose } = require("mongoose");

const purchaseToken = async (req, res) => {
  try {
    const userId = req.data.id;
    const { id: saleId, quantity } = req.body;

    const userData = await User.findById({
      _id: new mongoose.Types.ObjectId(userId),
    });

    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }
    const customerStripeId = userData.customerStripeId;
    if (!customerStripeId) {
      const customerData = await createCustomer(userEmail);
      if (!customerData.isSuccess) {
        return httpResponse(
          res,
          statusCode.errorPage,
          false,
          message.userNotCreatedOnStripe,
          null
        );
      }
      customerStripeId = customerData.customerId;

      userData.customerStripeId = customerStripeId;
      await userData.save();
    }

    const saleData = await Sale.findById(saleId);
    if (saleData?.active !== true) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.saleNotFound
      );
    }

    const checkoutSession = await createSession(
      customerStripeId,
      saleData.tokenPrice,
      "usd",
      "payment",
      quantity,
      "successUrl",
      "errorUrl",
      {
        userId: userId,
        saleId: saleData.id,
        price: saleData.tokenPrice,
        quantity,
      }
    );
    if (!checkoutSession.success) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.saleNotFound
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.adminAddressSet,
      checkoutSession
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  purchaseToken,
};
