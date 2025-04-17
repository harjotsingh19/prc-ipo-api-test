const { apiResponse } = require('./common');

const getInvestors = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get investors listing",
        description: "Get investors listing",
        operationId: "getInvestors",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'investorId',
            description: 'Enter investorId',
            schema: {
                type: 'string',
            },
        }],
        responses: apiResponse,
    },
};

const getInvestorInvestments = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get investors investment listing",
        description: "Get investors investment listing",
        operationId: "getInvestorsInvestments",
        parameters: [{
            in: 'path',
            name: 'walletAddress',
            required: true,
            description: 'Enter investor walletAddress',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }],
        responses: apiResponse,
    },
};

const getAllInvestments = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get Investments listing",
        description: "Get Investments listing",
        operationId: "getAllInvestments",
        parameters: [{
            in: 'query',
            name: 'filter',
            description: 'Enter filter value (eg. last10, top10)',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'page',
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'saleId',
            description: 'Enter sale id',
            schema: {
                type: 'string',
            },
        }],
        responses: apiResponse,
    },
};

const getSales = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get Sales listing",
        description: "Get Sales listing",
        operationId: "getAllSales",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }],
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
        parameters: [{
            in: 'body',
            name: 'saleData',
            schema: {
                type: 'object',
                required: ['saleId', 'startTime', 'endTime', 'tokenPrice', 'txnHash', 'blockNumber', 'blockHash', 'txnIndex'],
                properties: {
                    saleId: {
                        type: 'number',
                    },
                    startTime: {
                        type: 'date',
                    },
                    endTime: {
                        type: 'date',
                    },
                    tokenPrice: {
                        type: 'number',
                    },
                    txnHash: {
                        type: 'string',
                    },
                    blockNumber: {
                        type: 'number',
                    },
                    blockHash: {
                        type: 'string',
                    },
                    txnIndex: {
                        type: 'number',
                    },
                },
            },
        }],
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
        parameters: [{
            in: 'body',
            name: 'tokenData',
            schema: {
                type: 'object',
                properties: {
                    tokenName: {
                        type: 'string'
                    },
                    tokenSymbol: {
                        type: 'string'
                    },
                    tokenAddress: {
                        type: 'string'
                    },
                    totalSupply: {
                        type: 'number',
                    },
                    fundsRaised: {
                        type: 'number',
                    },
                    availableTokens: {
                        type: 'number',
                    },
                    claimedTokens: {
                        type: 'number',
                    },
                    tokenDecimals: {
                        type: 'number',
                    }
                },
            },
        }],
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

const whitelistWalletAddress = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get Whitelist wallet address list",
        description: "Get Whitelist wallet address list",
        operationId: "whitelistWalletAddressList",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }],
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
        parameters: [{
            in: 'body',
            name: 'data',
            require: ['walletAddress'],
            schema: {
                type: 'object',
                properties: {
                    walletAddress: {
                        type: 'string'
                    },
                },
            },
        }],
        responses: apiResponse,
    },
};

const investorKyc = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get investors KYC list",
        description: "Get investors KYC list",
        operationId: "investorKycList",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'status',
            description: 'Enter status',
            schema: {
                type: 'string',
            },
        }],
        responses: apiResponse,
    },
};

const investorKycUpdate = {
    patch: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Investors KYC Update",
        description: "Investors KYC Update",
        operationId: "investorKycStatusUpdate",
        parameters: [{
            in: 'path',
            name: 'id',
            required: true,
            description: 'Enter investor id',
            schema: {
                type: 'string',
            },
        }, {
            in: 'body',
            name: 'data',
            require: ['status'],
            schema: {
                type: 'object',
                properties: {
                    status: {
                        type: 'string'
                    },
                    reason: {
                        type: 'string'
                    },
                },
            },
        }],
        responses: apiResponse,
    },
};

const getSaleStatistics = {
    get: {
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
        summary: "Get sale statistics list",
        description: "Get sale statistics list",
        operationId: "saleStatistics",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }],
        responses: apiResponse,
    },
}

const getUserAnalytics = {
    get: {
        tags: ["Analytics"],
        security: [{ bearerAuth: [] }],
        summary: "Get user analytics",
        description: "Get user analytics",
        operationId: "userAnalytics",
        parameters: [{
            in: 'path',
            name: 'userId',
            required: true,
            description: 'Enter userId',
            schema: {
                type: 'string',
            },
        }],
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

const getBlacklistAddressList = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get Blacklist wallet address list",
        description: "Get Blacklist wallet address list",
        operationId: "blacklistWalletAddressList",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }],
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
        parameters: [{
            in: 'path',
            name: 'saleId',
            required: true,
            description: 'Enter saleId',
            schema: {
                type: 'string',
            },
        }],
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
        parameters: [{
            in: 'path',
            name: 'userId',
            required: true,
            description: 'Enter userId',
            schema: {
                type: 'string',
            },
        }, {
            in: 'body',
            name: 'data',
            schema: {
                type: 'object',
                required: ['onchainId'],
                properties: {
                    onchainId: {
                        type: 'string'
                    },
                },
            },
        }],
        responses: apiResponse,
    }
};

const getClaimTokenHistory = {
    get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Get claim token history list",
        description: "Get claim token history list",
        operationId: "getClaimTokenHistory",
        parameters: [{
            in: 'query',
            name: 'page',
            required: true,
            description: 'Enter page number',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'pageSize',
            required: true,
            description: 'Enter page size',
            schema: {
                type: 'string',
            },
        }, {
            in: 'query',
            name: 'investorAddress',
            description: 'Enter investor Address',
            schema: {
                type: 'string',
            },
        }],
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

module.exports = {
    getInvestors,
    getInvestorInvestments,
    getAllInvestments,
    getSales,
    createSale,
    createGetToken,
    whitelistWalletAddress,
    setAdminWalletAddress,
    investorKyc,
    getSaleStatistics,
    getUserAnalytics,
    dashboard,
    investorKycUpdate,
    getBlacklistAddressList,
    getDistributionAnalytics,
    updateInvestorOnchainId,
    getClaimTokenHistory,
    downloadPdf,
};
