const User = require("../models/User");
const Sale = require("../models/Sale");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const { default: mongoose } = require("mongoose");
const config = require("../config/config");

const { createCustomer, createSession } = require("../utils/stripeMethods");

const purchaseToken = async (req, res) => {
  try {
    console.log("🚀 ~ purchaseToken ~ req.body:", req.data);
    if (req.data.role != "INVESTOR") {
      return httpResponse(
        res,
        statusCode.unAuthorized,
        false,
        message.userIsNotInVestor
      );
    }

    const userId = req.data.id;

    let { saleId, quantity, amountPaid } = req.body;

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

    amountPaid = Math.round(amountPaid);

    console.log("🚀 ~ purchaseToken ~amount to Pay:", amountPaid);

    const checkoutSession = await createSession({
      customerId: customerStripeId,
      amountPaid: amountPaid,
      currency: "usd",
      mode: "payment",
      successUrl: `${config.userFrontendUrl}payment-status/success?session_id={CHECKOUT_SESSION_ID}`,
      errorUrl: `${config.userFrontendUrl}payment-status/failure?session_id={CHECKOUT_SESSION_ID}`,
      metaData: {
        userId: userId,
        tokenIn: Number(quantity),
        saleId: saleData._id.toString(),
        tokenOut: amountPaid / 100,
      },
      couponId: "",
      quantity: Number(quantity),
    });

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
