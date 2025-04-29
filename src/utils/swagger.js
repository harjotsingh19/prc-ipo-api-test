const {
  enableMFA,
  verifyMFA,
  updateProfile,
  addUserActivity,
  getUserProfile,
  logout,
  changePassword,
  addWallet,
} = require("./swaggerComp/user");
const adminComp = require("./swaggerComp/admin");
const { apiResponse, uploadDocs } = require("./swaggerComp/common");
const investorComp = require("./swaggerComp/investor");
const authComp = require("./swaggerComp/auth");

const swaggerDefinition = {
  openapi: "3.0.3",
  definition: {
    info: {
      version: "1.0.0",
      title: "PRC-ICO",
      description: "PRC-ICO",
      // contact: {
      //   name: "Developer",
      //   email: "manpreet@debutinfotech.com",
      // },
    },
    servers: [
      {
        url: "http://localhost:14003",
        description: "Local Development Server",
      },
    ],
    paths: {
      // "/health": {
      //   get: {
      //     tags: ["Health"],
      //     summary: "Get Application Health status",
      //     description: "Checks the health of the application",
      //     operationId: "getHealth",
      //     parameters: [],
      //     responses: apiResponse,
      //   },
      // },
      // "/auth/addWalletAddress": authComp.addWalletAddress,
      "/auth/login": authComp.login,
      "/auth/forgotPassword": authComp.forgotPassword,
      "/auth/resetPassword/{token}": authComp.resetPassword,
      "/auth/register": authComp.register,
      "/auth/verifyOtp": authComp.verifyOtp,
      "/auth/resendOtp": authComp.resendOtp,
      "/auth/refresh-token": authComp.refreshToken,
      "/user/enable-mfa/{id}": enableMFA,
      "/user/verify-mfa/{id}": verifyMFA,
      "/user/profile/{id}": updateProfile,
      "/user/activity": addUserActivity,
      "/user/me": getUserProfile,
      "/user/logout": logout,
      "/user/change-password": changePassword,
      "/user/wallet": addWallet,
      "/admin/investors": adminComp.getInvestors,
      "/admin/investors/{id}": adminComp.getInvestorById,
      "/admin/investments": adminComp.getAllInvestments,
      "/admin/investments/{id}": adminComp.getInvestmentsById,
      "/admin/download-investments": adminComp.downloadInvestments,
      "/sales": adminComp.getSales,
      "/sales/{id}": adminComp.getSale,
      "/sales/purchase": adminComp.purchaseToken,
      "/admin/sales": adminComp.createSale,
      "/admin/user-status/{id}": adminComp.updateUserStatus,
      "/admin/dashboard": adminComp.dashboard,
      "/investor": investorComp.getInvestments,
      "/investor/contribution": investorComp.getContributions,
      "/admin/transactions": adminComp.getTransactions,
      "/admin/sales/airdrop/{id}": adminComp.getAirdrop,
      "/admin/sales/airdrop": adminComp.updateSaleTransactions,
    },
    schemes: ["http", "https"],
    securityDefinitions: {
      bearerAuth: {
        type: "apiKey",
        scheme: "Bearer",
        bearerFormat: "JWT",
        name: "Authorization",
        in: "header",
      },
    },
  },
  apis: ["app.js"],
};

module.exports = {
  swaggerDefinition,
};
