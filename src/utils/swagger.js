const {
  enableMFA,
  verifyMFA,
  updateProfile,
  addUserActivity,
  getUserProfile,
  logout,
  changePassword,
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
      title: "RVA",
      description: "RVA",
      contact: {
        name: "Developer",
        email: "manpreet@debutinfotech.com",
      },
    },
    servers: [
      {
        url: "http://localhost:14003",
        description: "Local Development Server",
      },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["Health"],
          summary: "Get Application Health status",
          description: "Checks the health of the application",
          operationId: "getHealth",
          parameters: [],
          responses: apiResponse,
        },
      },
      "/auth/addWalletAddress": authComp.addWalletAddress,
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
      "/admin/investors": adminComp.getInvestors,
      "/admin/investors-investments/{walletAddress}":
        adminComp.getInvestorInvestments,
      "/admin/investments": adminComp.getAllInvestments,
      "/sales": adminComp.getSales,
      "/sales/{id}": adminComp.getSale,
      "/sales/purchase": adminComp.purchaseToken,
      "/admin/sales": adminComp.createSale,
      "/admin/token": adminComp.createGetToken,
      "/admin/address-whitelist": adminComp.whitelistWalletAddress,
      "/admin/setAdminAddress": adminComp.setAdminWalletAddress,
      "/admin/investorKyc": adminComp.investorKyc,
      "/admin/investorKyc/{id}": adminComp.investorKycUpdate,
      "/admin/sale-statistics": adminComp.getSaleStatistics,
      "/admin/user-analytics/{userId}": adminComp.getUserAnalytics,
      "/admin/distribution-analytics/{saleId}":
        adminComp.getDistributionAnalytics,
      "/admin/dashboard": adminComp.dashboard,
      "/admin/address-blacklist": adminComp.getBlacklistAddressList,
      "/admin/investor/onchain-id/{userId}": adminComp.updateInvestorOnchainId,
      "/admin/claim-token-history": adminComp.getClaimTokenHistory,
      "/admin/download-investments": adminComp.downloadPdf,
      "/investor": investorComp.getInvestments,
      "/investor/kyc": investorComp.getKycStatus,
      "/investor/investment/vesting-schedule/{id}":
        investorComp.viewVestingSchedule,
      "/investor/claim-history": investorComp.getTokenClaimHistory,
      "/kyc/uploadDocs": uploadDocs,
      "/admin/transactions": adminComp.getTransactions,
    },
    schemes: ["http", "https"],
    securityDefinitions: {
      bearerAuth: {
        type: "apiKey",
        scheme: "bearer",
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
