const config = require("../config/config");
const secret_key = config.STRIPE_TOKEN;
const stripe = require("stripe")(secret_key);

// const createSession = async (
//   customerId,
//   amount,
//   currency,
//   mode,
//   quantity,
//   successUrl,
//   errorUrl,
//   metaData,
//   couponId
// ) => {
//   try {
//     const sessionPayload = {
//       mode,
//       customer: customerId,
//       payment_method_types: ["card"],
//       metadata: metaData,
//       line_items: [
//         {
//           price_data: {
//             currency: currency,
//             product_data: {
//               name: "PRC TOKEN",
//               description: "One-time purchase",
//             },
//             unit_amount: amount,
//           },
//           quantity,
//         },
//       ],
//       success_url: successUrl,
//       cancel_url: errorUrl,
//     };

//     if (couponId) {
//       sessionPayload.discounts = [
//         {
//           coupon: couponId,
//         },
//       ];
//     }

//     console.log("running payment");

//     const sessionData = await stripe.checkout.sessions.create(sessionPayload);
//     if (sessionData) {
//       return { success: true, data: { resData: sessionData } };
//     } else {
//       return { success: false, data: { resData: {} } };
//     }
//   } catch (error) {
//     console.log("error while paying: ", error);
//     return { success: false, data: { resData: {} }, error };
//   }
// };

// const createSession = async (
//   customerId,
//   amount,
//   currency,
//   mode,
//   successUrl,
//   errorUrl,
//   metaData,
//   couponId,
//   quantity
// ) => {
//   try {
//     // Log all parameters and their types
//     console.log("customerId:", customerId, typeof customerId);
//     console.log("amount:", amount, typeof amount);
//     console.log("currency:", currency, typeof currency);
//     console.log("mode:", mode, typeof mode);
//     console.log("successUrl:", successUrl, typeof successUrl);
//     console.log("errorUrl:", errorUrl, typeof errorUrl);
//     console.log("metaData:", metaData, typeof metaData);
//     console.log("couponId:", couponId, typeof couponId);
//     console.log("quantity:", quantity, typeof quantity);

//     const sessionPayload = {
//       mode,
//       customer: customerId,
//       payment_method_types: ["card"],
//       metadata: metaData,
//       line_items: [
//         {
//           price_data: {
//             currency: currency,
//             product_data: {
//               name: "PRC TOKEN",
//               description: "One-time purchase",
//             },
//             unit_amount: amount,
//           },
//           quantity: Number(quantity), // ensure quantity is numeric
//         },
//       ],
//       success_url: successUrl,
//       cancel_url: errorUrl,
//     };

//     if (couponId) {
//       sessionPayload.discounts = [{ coupon: couponId }];
//     }

//     const sessionData = await stripe.checkout.sessions.create(sessionPayload);
//     // console.log("🚀 ~ sessionData:", sessionData);
//     return { success: true, data: { url: sessionData.url } };
//   } catch (error) {
//     console.log("error while paying: ", error);
//     return { success: false, data: { resData: {} }, error };
//   }
// };

const createSession = async (
  customerId,
  amount,
  currency,
  mode,
  successUrl,
  errorUrl,
  metaData,
  couponId,
  quantity
) => {
  try {
    // Log all parameters and their types
    console.log("customerId:", customerId, typeof customerId);
    console.log("amount:", amount, typeof amount);
    console.log("currency:", currency, typeof currency);
    console.log("mode:", mode, typeof mode);
    console.log("successUrl:", successUrl, typeof successUrl);
    console.log("errorUrl:", errorUrl, typeof errorUrl);
    console.log("metaData:", metaData, typeof metaData);
    console.log("couponId:", couponId, typeof couponId);
    console.log("quantity:", quantity, typeof quantity);

    const sessionPayload = {
      mode,
      customer: customerId,
      payment_method_types: ["card"],
      payment_method_options: {
        card: {},
      },
      metadata: metaData,
      line_items: [
        {
          price_data: {
            currency: currency,
            product_data: {
              name: "PRC TOKEN",
            },
            unit_amount: Number(amount),
          },
          quantity: Number(quantity),
        },
      ],
      success_url: successUrl,
      cancel_url: errorUrl,
    };

    if (couponId) {
      sessionPayload.discounts = [{ coupon: couponId }];
    }

    const sessionData = await stripe.checkout.sessions.create(sessionPayload);
    return { success: true, data: { url: sessionData.url } };
  } catch (error) {
    console.log("error while paying: ", error);
    return { success: false, data: { resData: {} }, error };
  }
};

const expireSession = async (sessionId) => {
  try {
    const sessionData = await stripe.checkout.sessions.expire(sessionId);
    if (sessionData) {
      return { success: true, data: { resData: sessionData } };
    } else {
      return { success: false, data: { resData: {} } };
    }
  } catch (error) {
    console.log("error: ", error);
    return { success: false, data: { resData: {} }, error };
  }
};

const createCustomerPortalConfiguration = async (
  privacyPolicyUrl,
  termsAndConditionUrl
) => {
  try {
    const configuration = await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: config.PRODUCT_NAME, // Replace with your business name
        privacy_policy_url: privacyPolicyUrl, // Replace with your privacy policy URL
        terms_of_service_url: termsAndConditionUrl, // Replace with your terms of service URL
      },
      features: {
        customer_update: {
          allowed_updates: ["name", "address", "phone"],
          enabled: true,
        },
        invoice_history: {
          enabled: false,
        },
        payment_method_update: {
          enabled: true,
        },
        // subscription_pause: {
        //   enabled: false, // Disable subscription cancellation
        // },
        // subscription_cancel: { enabled: false },
        // subscription_update: {
        //   enabled: true,
        //   default_allowed_updates: ["price"], // Allow plan switching
        //   proration_behavior: ProrationBehavior.createProrations, // Enables prorating charges for immediate effect
        //   products: products,
        // },
      },
    });

    if (configuration) {
      return { success: true, data: { resData: configuration } };
    } else {
      return { success: false, data: { resData: {} } };
    }
  } catch (error) {
    console.log("error: ", error);
    return { success: false, data: { resData: {} }, error };
  }
};

const createCustomer = async (email, address = {}) => {
  try {
    if (!email) {
      return { isSuccess: false, error: messages.fieldError };
    }

    const customer = await stripe.customers.create({
      email,
      // address: {
      //   city: address.city ? address.city : null,
      //   country: address.country ? address.country : null,
      //   line1: address.line1 ? address.line1 : null,
      //   line2: address.line2 ? address.line2 : null,
      //   postal_code: address.postal_code ? address.postal_code : null,
      //   state: address.state ? address.state : null,
      // },
    });
    if (customer && customer.id) {
      return { isSuccess: true, customerId: customer.id };
    } else {
      return { isSuccess: false, error: messages.fieldError };
    }
  } catch (error) {
    return { isSuccess: false, error: error.message };
  }
};
module.exports = {
  createCustomerPortalConfiguration,
  expireSession,
  createSession,
  createCustomer,
};
