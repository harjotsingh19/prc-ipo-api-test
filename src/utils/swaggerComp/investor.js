const { apiResponse } = require("./common");
const getInvestments = {
  get: {
    tags: ["Investor"],
    security: [{ bearerAuth: [] }],
    summary: "Get investor investment",
    description: "Get investor investment",
    operationId: "getInvestment",
    parameters: [],
    responses: apiResponse,
  },
};

const getKycStatus = {
  get: {
    tags: ["Investor"],
    security: [{ bearerAuth: [] }],
    summary: "Get KYC status",
    description: "Get KYC status",
    operationId: "getKycStatus",
    parameters: [],
    responses: apiResponse,
  },
};

const viewVestingSchedule = {
  get: {
    tags: ["Investor"],
    security: [{ bearerAuth: [] }],
    summary: "Get investment vesting schedule",
    description: "Get investment vesting schedule",
    operationId: "viewVestingSchedule",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        description: "Enter investment id",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const getTokenClaimHistory = {
  get: {
    tags: ["Investor"],
    security: [{ bearerAuth: [] }],
    summary: "Get claim token history list",
    description: "Get claim token history list",
    operationId: "getTokenClaimHistory",
    parameters: [
      {
        in: "query",
        name: "page",
        required: true,
        description: "Enter page number",
        schema: {
          type: "string",
        },
      },
      {
        in: "query",
        name: "pageSize",
        required: true,
        description: "Enter page size",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const getContributions = {
  get: {
    tags: ["Investor"],
    security: [{ bearerAuth: [] }],
    summary: "Get token contribution received",
    description: "Get token contribution received",
    operationId: "getContributions",
    parameters: [],
    responses: apiResponse,
  },
};

module.exports = {
  getInvestments,
  getKycStatus,
  viewVestingSchedule,
  getTokenClaimHistory,
  getContributions,
};
