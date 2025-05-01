const Sale = require("../../models/Sale");
const { apiResponse } = require("./common");

const commonGetConfig = (summary, description, operationId, parameters) => ({
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary,
    description,
    operationId,
    parameters,
    responses: apiResponse,
  },
});

const commonGetPutConfig = (summary, description, operationId, parameters) => ({
  put: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary,
    description,
    operationId,
    parameters,
    responses: apiResponse,
  },
});

const downloadInvestments = commonGetConfig(
  "Download Investments PDF",
  "Download all investment transactions as a PDF file",
  "downloadInvestments",
  []
);

const getSales = {
  get: {
    tags: ["Sales"],
    security: [{ bearerAuth: [] }],
    summary: "Get Sales listing",
    description: "Get Sales listing",
    operationId: "getAllSales",
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
      {
        in: "query",
        name: "search",
        schema: {
          type: "string",
        },
        description: "Enter the Name or the name to search sale",
      },
      {
        in: "query",
        name: "status",
        schema: {
          type: "string",
        },
        description: "The Status you have selected is Invalid.",
      },
      {
        in: "query",
        name: "fromDate",
        schema: {
          type: "date",
        },
        description: "User Registration 'From Date' is not in correct format.",
      },
      {
        in: "query",
        name: "toDate",
        schema: {
          type: "date",
        },
        description: "User Registration 'To Date' is not in correct format.",
      },
      {
        in: "query",
        name: "sortBy",
        schema: {
          type: "integer",
        },
        description: '[{"id":"username","desc":true}]',
      },
    ],
    responses: apiResponse,
  },
};

const getAirdrop = commonGetPutConfig(
  "Get Sale Airdrop Transactions and Process Fund Transfer",
  "Fetch paginated user data for a completed sale and optionally process token transfers based on `transactedData` in the request body. Only works for sales that are no longer active.",
  "getAllSaleAirdrop",
  [
    {
      in: "path",
      name: "id",
      required: true,
      description: "Sale ID",
      schema: {
        type: "string",
      },
    },
    {
      in: "query",
      name: "page",

      description: "Page number for pagination",
      schema: {
        type: "string",
      },
    },
    {
      in: "query",
      name: "pageSize",

      description: "Page size for pagination",
      schema: {
        type: "string",
      },
    },
    {
      in: "body",
      name: "transactedData",
      required: false,
      description:
        "Optional array of transaction objects to directly trigger airdrop",
      schema: {
        type: "object",
        properties: {
          transactedData: {
            type: "array",
            items: {
              type: "object",
              properties: {
                userId: { type: "string" },
                walletAddress: { type: "string" },
                totalTokens: { type: "number" },
              },
            },
          },
        },
      },
    },
  ]
);

const getTokenAirdrop = commonGetConfig(
  "Get Sale Airdrop listing",
  "Get Sale Airdrop listing",
  "getAllSaleAirdrop",
  [
    {
      in: "query",
      name: "id",
      required: true,
      description: "Sale ID",
      schema: { type: "string" },
    },
    {
      in: "query",
      name: "page",
      required: false,
      description: "Page number",
      schema: { type: "integer", example: 1 },
    },
    {
      in: "query",
      name: "pageSize",
      required: false,
      description: "Items per page",
      schema: { type: "integer", example: 10 },
    },
    {
      in: "query",
      name: "search[email]",
      required: false,
      description: "Search by email",
      schema: { type: "string", example: "john@example.com" },
    },
    {
      in: "query",
      name: "search[firstName]",
      required: false,
      description: "Search by first name",
      schema: { type: "string" },
    },
    {
      in: "query",
      name: "sort[totalTokens]",
      required: false,
      description: "Sort by totalTokens. Use 'asc' or 'desc'.",
      schema: { type: "string", example: "desc" },
    },
    {
      in: "query",
      name: "range[createdAt][start]",
      required: false,
      description: "Start date for createdAt filter",
      schema: { type: "string", format: "date-time" },
    },
    {
      in: "query",
      name: "range[createdAt][end]",
      required: false,
      description: "End date for createdAt filter",
      schema: { type: "string", format: "date-time" },
    },
  ]
);

const updateAirdropTransactionStatus = commonGetPutConfig(
  "Update token transfer status",
  "Marks paymentTokenOutStatus as true and stores the paymentHash for each user in a sale.",
  "updateTokenTransferStatus",
  [
    {
      in: "path",
      name: "id",
      required: true,
      description: "Enter sale Id",
      schema: {
        type: "string",
      },
    },
    {
      in: "body",
      name: "body",
      required: true,
      description:
        "Transaction details and user list for token transfer update",
      schema: {
        type: "object",
        required: ["transactedData", "transactionHash"],
        properties: {
          transactedData: {
            type: "array",
            items: {
              type: "object",
              required: [
                "_id",
                "email",
                "firstName",
                "lastName",
                "walletAddress",
                "totalTokens",
              ],
              properties: {
                _id: {
                  type: "string",
                  example: "680a5c2463688901ab91fca8",
                },
                email: {
                  type: "string",
                  example: "prcuser@yopmail.com",
                },
                firstName: {
                  type: "string",
                  example: "Vaibhav",
                },
                lastName: {
                  type: "string",
                  example: "Stoinis",
                },
                walletAddress: {
                  type: "string",
                  example: "0x238092A986b187e5A9C220DDd5034197E023e480",
                },
                totalTokens: {
                  type: "number",
                  example: 41.7,
                },
              },
            },
          },
          transactionHash: {
            type: "string",
            example: "tytyttt7898",
          },
        },
      },
    },
  ]
);

const getInvestorById = commonGetConfig(
  "Get Investor details by ID",
  "Get Investor details by ID",
  "getInvestorById",
  [
    {
      in: "path",
      name: "id",
      required: true,
      description: "Investor ID (MongoDB ObjectId)",
      schema: {
        type: "string",
      },
    },
    {
      in: "query",
      name: "sortBy",
      description:
        "Field to sort transactions by (transactionDate, tokenIn, tokenOut)",
      schema: {
        type: "string",
        enum: ["transactionDate", "tokenIn", "tokenOut"],
        default: "transactionDate",
      },
    },
    {
      in: "query",
      name: "sortOrder",
      description: "Sort order for transactions",
      schema: {
        type: "string",
        enum: ["asc", "desc"],
        default: "desc",
      },
    },
    {
      in: "query",
      name: "page",
      description: "Page number for paginated transactions",
      schema: {
        type: "integer",
        default: 1,
        minimum: 1,
      },
    },
    {
      in: "query",
      name: "limit",
      description: "Number of transactions per page",
      schema: {
        type: "integer",
        default: 10,
        minimum: 1,
      },
    },
  ]
);

const getInvestors = commonGetConfig(
  "Get investors listing",
  "Get investors listing",
  "getInvestors",
  [
    {
      in: "query",
      name: "page",
      schema: { type: "integer", default: 1 },
      description: "Page number",
    },
    {
      in: "query",
      name: "pageSize",
      schema: { type: "integer", default: 10 },
      description: "Number of items per page",
    },
    {
      in: "query",
      name: "investorId",
      schema: { type: "string" },
      description: "Filter by investor ID",
    },
    {
      in: "query",
      name: "isBlocked",
      schema: { type: "boolean" },
      description: "Filter by blocked status",
    },
    {
      in: "query",
      name: "sortBy",
      schema: { type: "string" },
      description:
        "Field to sort by (e.g., firstName, lastName, email, tokenIn, tokenOut)",
    },
    {
      in: "query",
      name: "sortOrder",
      schema: { type: "string", enum: ["asc", "desc"] },
      description: "Sort order (asc or desc)",
    },
    {
      in: "query",
      name: "search",
      schema: { type: "string" },
      description:
        "Search term for firstName, lastName, email, or walletAddress",
    },
  ]
);

const getAllInvestments = commonGetConfig(
  "Get Investments listing",
  "Get Investments listing",
  "getAllInvestments",
  [
    {
      in: "query",
      name: "filter",
      description: "Filter investments (e.g., last10, top10)",
      schema: { type: "string" },
    },
    {
      in: "query",
      name: "page",
      description: "Page number for pagination (default: 1)",
      schema: { type: "integer" },
    },
    {
      in: "query",
      name: "pageSize",
      description: "Number of records per page (default: 10)",
      schema: { type: "integer" },
    },
    {
      in: "query",
      name: "saleId",
      description: "Filter by Sale ID (MongoDB ObjectId)",
      schema: { type: "string" },
    },
    {
      in: "query",
      name: "search",
      description: "Search by user name, email or sale name",
      schema: { type: "string" },
    },
    {
      in: "query",
      name: "sortBy",
      description: "Sort field (transactionDate, tokenIn, tokenOut)",
      schema: {
        type: "string",
        enum: ["transactionDate", "tokenIn", "tokenOut"],
        default: "transactionDate",
      },
    },
    {
      in: "query",
      name: "sortOrder",
      description: "Sort order (asc or desc)",
      schema: {
        type: "string",
        enum: ["asc", "desc"],
        default: "desc",
      },
    },
  ]
);

const updateUserStatus = {
  patch: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Update User Status",
    description: "Allows an admin to block or unblock a user.",
    operationId: "updateUserStatus",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        description: "The ID of the user to update.",
        schema: {
          type: "string",
        },
      },
      {
        in: "body",
        name: "userData",
        required: true,
        description: "The data to update the user's status.",
        schema: {
          type: "object",
          required: ["isBlocked"],
          properties: {
            isBlocked: {
              type: "boolean",
              description: "Set to true to block the user, false to unblock.",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

module.exports = {
  // ...existing exports
  updateUserStatus,
};

const getInvestmentsById = {
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Get Investment details",
    description: "Get Investemnt details",
    operationId: "getInvestmentDetails",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        description: "Enter id",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const getSale = {
  get: {
    tags: ["Sales"],
    security: [{ bearerAuth: [] }],
    summary: "Get Sale",
    description: "Get Sale",
    operationId: "getSale",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        description: "Enter id",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const purchaseToken = {
  post: {
    tags: ["sale"],
    security: [{ bearerAuth: [] }],
    summary: "Purchase token",
    description:
      "Initiates a token purchase process and returns a Stripe checkout session URL.",
    operationId: "purchaseToken",
    parameters: [
      {
        in: "body",
        name: "purchaseToken",
        schema: {
          type: "object",
          required: ["saleId", "quantity", "amountPaid"],
          properties: {
            saleId: {
              type: "string",
              description: "The ID of the sale.",
            },
            quantity: {
              type: "number",
              description: "The number of tokens to purchase.",
            },
            amountPaid: {
              type: "number",
              description: "The total price of the tokens in cents.",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const createSale = {
  post: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Create sale",
    description: "Create sale",
    operationId: "createSale",
    parameters: [
      {
        in: "body",
        name: "saleData",
        schema: {
          type: "object",
          required: ["name", "startDate", "endDate", "tokenPrice"],
          properties: {
            name: {
              type: "string",
            },
            startDate: {
              type: "string",
              format: "date-time",
            },
            endDate: {
              type: "string",
              format: "date-time",
            },
            tokenPrice: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const createGetToken = {
  post: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Create Token",
    description: "Create Token",
    operationId: "createToken",
    parameters: [
      {
        in: "body",
        name: "tokenData",
        schema: {
          type: "object",
          properties: {
            tokenName: {
              type: "string",
            },
            tokenSymbol: {
              type: "string",
            },
            tokenAddress: {
              type: "string",
            },
            totalSupply: {
              type: "number",
            },
            fundsRaised: {
              type: "number",
            },
            availableTokens: {
              type: "number",
            },
            claimedTokens: {
              type: "number",
            },
            tokenDecimals: {
              type: "number",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Get Token Details",
    description: "Get Token Details",
    operationId: "getToken",
    parameters: [],
    responses: apiResponse,
  },
};

const setAdminWalletAddress = {
  post: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Set admin wallet address",
    description: "Set admin wallet address",
    operationId: "setAdminWalletAddress",
    parameters: [
      {
        in: "body",
        name: "data",
        require: ["walletAddress"],
        schema: {
          type: "object",
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

const getUserAnalytics = {
  get: {
    tags: ["Analytics"],
    security: [{ bearerAuth: [] }],
    summary: "Get user analytics",
    description: "Get user analytics",
    operationId: "userAnalytics",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        description: "Enter userId",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const dashboard = {
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Get dashboard data",
    description: "Get dashboard data",
    operationId: "dashboard",
    parameters: [],
    responses: apiResponse,
  },
};

const getDistributionAnalytics = {
  get: {
    tags: ["Analytics"],
    security: [{ bearerAuth: [] }],
    summary: "Get Distribution analytics",
    description: "Get Distribution analytics",
    operationId: "getDistributionAnalytics",
    parameters: [
      {
        in: "path",
        name: "saleId",
        required: true,
        description: "Enter saleId",
        schema: {
          type: "string",
        },
      },
    ],
    responses: apiResponse,
  },
};

const updateInvestorOnchainId = {
  patch: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Update investor onchain id",
    description: "Update investor onchain id",
    operationId: "updateInvestorOnchainId",
    parameters: [
      {
        in: "path",
        name: "userId",
        required: true,
        description: "Enter userId",
        schema: {
          type: "string",
        },
      },
      {
        in: "body",
        name: "data",
        schema: {
          type: "object",
          required: ["onchainId"],
          properties: {
            onchainId: {
              type: "string",
            },
          },
        },
      },
    ],
    responses: apiResponse,
  },
};

const downloadPdf = {
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Download investments transaction",
    description: "Download investments transaction",
    operationId: "downloadPdf",
    parameters: [],
    responses: apiResponse,
  },
};

const getTransactions = {
  get: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Get Transactions listing",
    description: "Get Transactions listing",
    operationId: "getAllTransactions",
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

const updateSaleTransactions = {
  put: {
    tags: ["Admin"],
    security: [{ bearerAuth: [] }],
    summary: "Update sale air drop transactions",
    description: "Update sale air drop transactions",
    operationId: "createSaleTransactions",
    parameters: [
      {
        in: "body",
        name: "saleTransactionData",
        schema: {
          type: "object",
          required: ["saleId", "userIds"],
          properties: {
            userIds: {
              type: "string",
            },
            saleId: {
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
  getInvestors,
  getInvestmentsById,
  getAllInvestments,
  getSales,
  createSale,
  createGetToken,
  setAdminWalletAddress,
  getUserAnalytics,
  dashboard,
  downloadInvestments,
  getDistributionAnalytics,
  updateInvestorOnchainId,
  downloadPdf,
  getSale,
  purchaseToken,
  getTransactions,
  getAirdrop,
  getTokenAirdrop,
  updateAirdropTransactionStatus,
  updateSaleTransactions,
  updateUserStatus,
  getInvestorById,
};
