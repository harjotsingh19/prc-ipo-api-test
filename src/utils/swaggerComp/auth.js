const { apiResponse } = require("./common");
const addWalletAddress = {
  post: {
    tags: ["Auth"],
    summary: "Signup or Login with walletAddress",
    description: "Signup or Login with walletAddress",
    operationId: "addWalletAddress",
    parameters: [
      {
        in: "body",
        name: "userData",
        schema: {
          type: "object",
          required: ["walletAddress"],
          properties: {
            walletAddress: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const login = {
  post: {
    tags: ["Auth"],
    summary: "Login",
    description: "Login",
    operationId: "login",
    parameters: [
      {
        in: "body",
        name: "userData",
        schema: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: {
              type: "string",
            },
            password: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const forgotPassword = {
  post: {
    tags: ["Auth"],
    summary: "Forgot Password",
    description: "Forgot Password",
    operationId: "forgotPassword",
    parameters: [
      {
        in: "body",
        name: "userData",
        schema: {
          type: "object",
          required: ["email"],
          properties: {
            email: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const resetPassword = {
  put: {
    tags: ["Auth"],
    summary: "Reset Password",
    description: "Reset Password",
    operationId: "resetPassword",
    parameters: [
      {
        in: "path",
        name: "token",
        required: true,
        description: "Enter token",
        schema: {
          type: "string",
        },
      },
      {
        in: "body",
        name: "userData",
        schema: {
          type: "object",
          required: ["newPassword", "confirmPassword"],
          properties: {
            newPassword: {
              type: "string",
            },
            confirmPassword: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const register = {
  post: {
    tags: ["Auth"],
    summary: "Register",
    description: "Register",
    operationId: "register",
    parameters: [
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["firstName", "lastName", "email", "password", "role"],
          properties: {
            firstName: {
              type: "string",
            },
            lastName: {
              type: "string",
            },
            email: {
              type: "string",
            },
            password: {
              type: "string",
            },
            role: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const verifyOtp = {
  post: {
    tags: ["Auth"],
    summary: "Verify OTP",
    description: "Verify OTP",
    operationId: "verifyOtp",
    parameters: [
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["userId", "otp", "operation"],
          properties: {
            userId: {
              type: "string",
            },
            otp: {
              type: "string",
            },
            operation: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const resendOtp = {
  post: {
    tags: ["Auth"],
    summary: "Resend OTP",
    description: "Resend OTP",
    operationId: "resendOtp",
    parameters: [
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["userId", "operation"],
          properties: {
            userId: {
              type: "string",
            },
            operation: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const refreshToken = {
  post: {
    tags: ["Auth"],
    summary: "Get refresh token",
    description: "Get refresh token",
    operationId: "refreshToken",
    parameters: [
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["refreshToken"],
          properties: {
            refreshToken: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

module.exports = {
  addWalletAddress,
  login,
  forgotPassword,
  resetPassword,
  register,
  verifyOtp,
  resendOtp,
  refreshToken,
};
