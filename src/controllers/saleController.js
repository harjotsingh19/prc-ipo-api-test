const User = require("../models/User");
const Sale = require("../models/Sale");
const { httpResponse } = require("../middleware/responseHandler");
// const { createSession } = require("../utils/stripeMethods");
const { statusCode, message } = require("../config/constants");
const { default: mongoose } = require("mongoose");
const config = require("../config/config");

const {
  createCustomer,
  createSession,
  createCustomerPortalConfiguration,
  expireSession,
} = require("../utils/stripeMethods");
// const { config } = require("dotenv");

// const purchaseToken = async (req, res) => {
//   try {
//     const userId = req.data.id;
//     console.log("🚀 ~ purchaseToken ~ userId:", userId);
//     const { id: saleId, quantity } = req.body;
//     console.log("🚀 ~ purchaseToken ~ req:", req.body);

//     const userData = await User.findById({
//       _id: new mongoose.Types.ObjectId(userId),
//     });

//     if (!userData) {
//       return httpResponse(
//         res,
//         statusCode.badRequest,
//         false,
//         message.userDoesnotExists
//       );
//     }

//     console.log("🚀 ~ purchaseToken ~ userData:", userData);

//     let customerStripeId = userData?.customerStripeId;
//     if (!customerStripeId) {
//       const customerData = await createCustomer(userData.email);
//       if (!customerData.isSuccess) {
//         return httpResponse(
//           res,
//           statusCode.errorPage,
//           false,
//           message.userNotCreatedOnStripe,
//           null
//         );
//       }
//       customerStripeId = customerData.customerId;
//       console.log("🚀 ~ purchaseToken ~ customerStripeId:", customerStripeId);

//       userData.customerStripeId = customerStripeId;
//       await userData.save();
//     }

//     const saleData = await Sale.findById(saleId);
//     if (saleData?.active !== true) {
//       return httpResponse(
//         res,
//         statusCode.errorPage,
//         false,
//         message.saleNotFound
//       );
//     }
//     console.log("🚀 ~ purchaseToken ~ saleData:", saleData);
//     const checkoutSession = await createSession(
//       customerStripeId,
//       saleData.tokenPrice,
//       "usd",
//       "payment",
//       `${config.userFrontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
//       `${config.userFrontendUrl}/cancel`,
//       {
//         userId: userId.toString(),
//         saleId: saleData._id.toString(),
//         price: saleData.tokenPrice.toString(),
//         quantity: quantity.toString(),
//       },
//       "",
//       quantity
//     );
//     console.log("🚀 ~ purchaseToken ~ checkoutSession:", checkoutSession);

//     if (!checkoutSession.success) {
//       return httpResponse(
//         res,
//         statusCode.errorPage,
//         false,
//         message.saleNotFound
//       );
//     }
//     return httpResponse(res, statusCode.ok, true, message.sentSessionUrl, {
//       url: checkoutSession.data.url,
//     });
//   } catch (error) {
//     console.log("🚀 ~ purchaseToken ~ error.message:", error.message);
//     return httpResponse(res, statusCode.errorPage, false, error.message);
//   }
// };

const purchaseToken = async (req, res) => {
  try {
    const userId = req.data.id;
    const { id: saleId, quantity, tokenPrice } = req.body;
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

    const saleData = await Sale.findById(saleId).exec();

    if (saleData?.active !== true) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.saleNotFound
      );
    }

    let customerStripeId = userData?.customerStripeId;
    if (!customerStripeId) {
      const customerData = await createCustomer(userData.email).exec();
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

    // const checkoutSession = await createSession(
    //   customerStripeId,
    //   tokenPrice, // tokenPrice in cents
    //   "usd",
    //   "payment",
    //   `${config.userFrontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    //   `${config.userFrontendUrl}/cancel`,
    //   {
    //     userId: userId.toString(),
    //     saleId: saleData._id.toString(),
    //     price: tokenPrice.toString(), // Save tokenPrice in metadata
    //     quantity: quantity.toString(),
    //   },
    //   "",
    //   quantity
    // );

    const checkoutSession = await createSession({
      customerId: customerStripeId,
      amount: tokenPrice, // in cents
      currency: "usd",
      mode: "payment",
      successUrl: `${config.userFrontendUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      errorUrl: `${config.userFrontendUrl}/cancel`,
      metaData: {
        userId: userId.toString(),
        saleId: saleData._id.toString(),
        price: tokenPrice.toString(),
        quantity: quantity.toString(),
      },
      couponId: "", // optional
      quantity: quantity,
    });
    console.log("🚀 ~ purchaseToken ~ checkoutSession:", checkoutSession);

    if (!checkoutSession.success) {
      return httpResponse(
        res,
        statusCode.errorPage,
        false,
        message.saleNotFound
      );
    }
    return httpResponse(res, statusCode.ok, true, message.sentSessionUrl, {
      url: checkoutSession.data.url,
    });
  } catch (error) {
    console.log("🚀 ~ purchaseToken ~ error.message:", error.message);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  purchaseToken,
};
