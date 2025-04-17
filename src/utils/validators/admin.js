const { check, validationResult } = require('express-validator');
const { httpResponse } = require("../../middleware/responseHandler");
const { statusCode } = require("../../config/constants");

exports.result = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return httpResponse(
            res,
            statusCode.badRequest,
            false,
            errors.array()[0].msg,
            []
        );
    }
    next();
};

exports.validateInvestorsList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];

exports.validateInvestorsInvestmentsList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
    check('walletAddress').trim().notEmpty().bail().withMessage('Wallet address is required.'),
];

exports.validateSaleList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];

exports.validateWhitelistAddressList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];

exports.validateInvestorKYCList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];

exports.validateStatisticsList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];

exports.validateCreateSale = [
    check('saleId').trim().notEmpty().bail().withMessage('saleId is required.'),
    check('startTime').trim().notEmpty().bail().withMessage('startTime is required.'),
    check('endTime').trim().notEmpty().bail().withMessage('endTime is required.'),
    check('tokenPrice').trim().notEmpty().bail().withMessage('tokenPrice is required.'),
    check('txnHash').trim().notEmpty().bail().withMessage('txnHash is required.'),
    check('blockNumber').trim().notEmpty().bail().withMessage('blockNumber is required.'),
    check('blockHash').trim().notEmpty().bail().withMessage('blockHash is required.'),
    check('txnIndex').trim().notEmpty().bail().withMessage('txnIndex is required.'),
];

exports.validateInvestorOnchainId = [
    check('onchainId').trim().notEmpty().bail().withMessage('Onchain id is required.')
];

exports.validateClaimTokenHistoryList = [
    check('page').trim().notEmpty().bail().withMessage('Page is required.'),
    check('pageSize').trim().notEmpty().bail().withMessage('Page size is required.'),
];
