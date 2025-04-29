const config = require("../config/config");
const secret_key = config.STRIPE_TOKEN;
const stripe = require("stripe")(secret_key);
const StripeSessionPayment = require("../models/stripePaymentSession");

const createSession = async (options) => {
  try {
    const {
      customerId,
      amountPaid,
      currency,
      mode,
      successUrl,
      errorUrl,
      metaData,
      couponId,
      quantity,
    } = options;

    console.log("customerId:", customerId, "Type:", typeof customerId);
    console.log(
      "amountPaid for 1 token :",
      amountPaid,
      "Type:",
      typeof amountPaid
    );
    console.log("currency:", currency, "Type:", typeof currency);
    console.log("mode:", mode, "Type:", typeof mode);
    console.log("successUrl:", successUrl, "Type:", typeof successUrl);
    console.log("errorUrl:", errorUrl, "Type:", typeof errorUrl);
    console.log("metaData:", metaData, "Type:", typeof metaData);
    console.log("couponId:", couponId, "Type:", typeof couponId);
    console.log("quantity:", quantity, "Type:", typeof quantity);

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
            unit_amount_decimal: amountPaid,
          },

          quantity: 1,
        },
      ],
      payment_intent_data: { metadata: metaData },
      success_url: successUrl,
      cancel_url: errorUrl,
    };

    if (couponId) {
      sessionPayload.discounts = [{ coupon: couponId }];
    }

    const sessionData = await stripe.checkout.sessions.create(sessionPayload);
    console.log("🚀 ~ createSession ~ sessionData:", sessionData);

    // Save session data to the database
    await StripeSessionPayment.create({
      sessionId: sessionData.id,
      paymentIntentId: sessionData.payment_intent || null,
      customerId: sessionData.customer,
      userId: metaData.userId || null,
      saleId: metaData.saleId || null,
      tokenIn: quantity,
      tokenOut: amountPaid / 100,
      currency: sessionData.currency,
      email: sessionData.customer_details.email || null,
      sessionCreationTime: sessionData.created,
      sessionExpirationTime: sessionData.expires_at || null,
      paymentStatus: sessionData.payment_status || "unpaid",
      failureReason: sessionData.failure_reason || null,
      expirationTime: sessionData.expires_at
        ? new Date(sessionData.expires_at * 1000)
        : null,
      metadata: sessionData.metadata || {},
      eventType: "checkout.session",
      status: sessionData.status || "incomplete",
    });

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
        headline: config.PRODUCT_NAME,
        privacy_policy_url: privacyPolicyUrl,
        terms_of_service_url: termsAndConditionUrl,
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
    if (customer?.id) {
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
