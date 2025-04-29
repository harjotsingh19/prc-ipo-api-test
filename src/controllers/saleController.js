const User = require("../models/User");
const Sale = require("../models/Sale");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const { default: mongoose } = require("mongoose");
const config = require("../config/config");

const { createCustomer, createSession } = require("../utils/stripeMethods");

const purchaseToken = async (req, res) => {
  try {
    const userId = req.data.id;
    console.log("🚀 ~ purchaseToken ~ userId:", userId);
    const { saleId, quantity, amountPaid } = req.body;
    console.log("🚀 ~ purchaseToken ~ req:", req.body);

    const userData = await User.findById({
      _id: new mongoose.Types.ObjectId(`${userId}`),
    }).exec();

    if (!userData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists
      );
    }

    if (userData?.isBlocked) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userIsBlocked
      );
    }

    const saleData = await Sale.findById(saleId).exec();
    console.log("🚀 ~ purchaseToken ~ saleData:", saleData);

    if (saleData?.active !== true) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.saleNotActive
      );
    }

    let customerStripeId = userData?.customerStripeId;
    if (!customerStripeId) {
      const customerData = await createCustomer(userData.email);
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

    console.log(
      "🚀 ~ purchaseToken ~ Number(amountPaid):",
      Math.round(amountPaid)
    );

    const checkoutSession = await createSession({
      customerId: customerStripeId,
      amountPaid: Math.round(amountPaid), // in cents
      currency: "usd",
      mode: "payment",
      successUrl: `http://localhost:3000/docs/#/sale/purchaseToken`,
      errorUrl: `http://localhost:3000/docs/#/sale/purchaseToken`,
      metaData: {
        userId: userId,
        tokenIn: Number(quantity),
        saleId: saleData._id.toString(),
        tokenOut: Number(amountPaid / 100),
      },
      couponId: "",
      quantity: Number(quantity),
    });
    console.log("🚀 ~ purchaseToken ~ checkoutSession:", checkoutSession);

    if (!checkoutSession.success) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.paymentUnsuccessful
      );
    }
    return httpResponse(res, statusCode.ok, true, message.sentSessionUrl, {
      url: checkoutSession.data.url,
    });
  } catch (error) {
    console.log("🚀 ~ purchaseToken ~ error.message:", error.message);
    return httpResponse(res, statusCode.badRequest, false, error.message);
  }
};

module.exports = {
  purchaseToken,
};
