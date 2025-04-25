const User = require("../models/User");
const Sale = require("../models/Sale");
const Token = require("../models/Token");
const { httpResponse } = require("../middleware/responseHandler");
const { isAdmin, addFiltersToWhereClause } = require("../utils/helper");
const {
  statusCode,
  message,
  status: userStatus,
  emailTemplateId,
} = require("../config/constants");
const { default: mongoose } = require("mongoose");
const Transaction = require("../models/Transaction");
const PrivateAddress = require("../models/PrivateAddress");
// const Kyc = require("../models/Kyc");
// const BlacklistAddress = require("../models/BlacklistAddress");
const tokenVesting = require("../models/tokenVesting");
// const  { rvaContract, verifyKyc, vestingContract } = require('../utils/blockchainManager');
const TokenClaimHistory = require("../models/TokenClaimHistory");
const { generatePDF } = require("../utils/pdfManager");
const moment = require("moment");
const { sendEmail } = require("../utils/mailManager");

const setAdminAddress = async (req, res) => {
  try {
    console.log("in setadminaddress api");
    const adminCheck = await isAdmin(req.data.role);
    const { walletAddress } = req.body;

    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userIsNotAdmin
      );
    }

    const admin = await User.findById({
      _id: new mongoose.Types.ObjectId(req.data.id),
    });

    if (admin.walletAddress != "") {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.adminAddressIsAlreadySet
      );
    }

    admin.walletAddress = walletAddress;
    admin.save();

    return httpResponse(res, statusCode.ok, true, message.adminAddressSet);
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getInvestors = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    let condition = { role: "INVESTOR" };
    if (req.query.investorId) {
      condition = {
        role: "INVESTOR",
        _id: new mongoose.Types.ObjectId(req.query.investorId),
      };
    }

    const aggregatePipeline = [
      {
        $match: condition,
      },
      {
        $addFields: {
          userWalletAddress: { $toLower: "$walletAddress" },
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { investorWalletAddress: "$userWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$from" }, "$$investorWalletAddress"],
                },
              },
            },
          ],
          as: "transactions",
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { investorWalletAddress: "$userWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$from" }, "$$investorWalletAddress"],
                },
              },
            },
            {
              $group: {
                _id: "$asset", // Group by asset
                totalAssetAmount: { $sum: "$assetAmount" }, // Sum the assetAmount for each asset
              },
            },
            {
              $project: {
                asset: "$_id",
                totalAssetAmount: 1,
                _id: 0,
              },
            },
          ],
          as: "groupedByAssets",
        },
      },
      {
        $addFields: {
          groupedByAsset: {
            $arrayToObject: {
              $map: {
                input: "$groupedByAssets",
                as: "summary",
                in: { k: "$$summary.asset", v: "$$summary.totalAssetAmount" },
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalTokensBought: {
            $sum: "$transactions.tokenAmount",
          },
          totalUSDValue: {
            $sum: "$transactions.value",
          },
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $project: {
          name: 1,
          onchainId: 1,
          walletAddress: 1,
          totalTokensBought: 1,
          totalUSDValue: 1,
          groupedByAsset: 1,
          "transactions.txnHash": 1,
          "transactions.value": 1,
          "transactions.tokenAmount": 1,
          "transactions.tokenPrice": 1,
          "transactions.saleId": 1,
          "transactions.created_at": 1,
          "transactions.assetAmount": 1,
          "transactions.asset": 1,
        },
      },
    ];

    if (!req.query.investorId) {
      aggregatePipeline.push({
        $facet: {
          metadata: [
            { $count: "totalCount" }, // Calculate total count of matching documents
          ],
          data: [
            { $skip: skip }, // Paginate results
            { $limit: pageSize }, // Limit results per page
          ],
        },
      });
      aggregatePipeline.push({
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] }, // Extract totalCount from metadata
        },
      });
    }

    const investors = await User.aggregate(aggregatePipeline);

    const paginatedData =
      req.query.investorId && investors.length
        ? investors
        : investors[0]?.data || [];
    const totalCount =
      req.query.investorId && investors.length
        ? 1
        : investors[0]?.totalCount || 0;

    const responseData = {
      page,
      pageSize,
      totalCount,
      investors: paginatedData,
    };

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestorsReturned,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const { filter, page, saleId } = req.query;

    let pipeline = [
      {
        $lookup: {
          from: "sales",
          localField: "saleId",
          foreignField: "_id",
          as: "saleDetails",
        },
      },
      {
        $unwind: {
          path: "$saleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { created_at: -1 } },
      {
        $project: {
          txnHash: 1,
          from: 1,
          value: 1,
          tokenAmount: 1,
          tokenPrice: 1,
          saleId: 1,
          asset: 1,
          assetAmount: 1,
          created_at: 1,
          saleDetails: 1,
        },
      },
    ];

    if (saleId) {
      pipeline.push({
        $match: { saleId: new mongoose.Types.ObjectId(saleId) },
      });
    }

    if (filter === "last10") {
      pipeline.push({ $sort: { created_at: -1 } }, { $limit: 10 });
    } else if (filter === "top10") {
      pipeline.push({ $sort: { tokenAmount: -1 } }, { $limit: 10 });
    } else if (page && req.query.pageSize) {
      const pageSize = parseInt(req.query.pageSize);
      const skip = (page - 1) * pageSize;
      pipeline.push({
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      });
      pipeline.push({
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
        },
      });

      const investments = await Transaction.aggregate(pipeline);
      const paginatedData = investments[0]?.data || [];
      const totalCount = investments[0]?.totalCount || 0;

      const responseData = {
        page,
        pageSize,
        totalCount,
        investments: paginatedData,
      };
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.allInvestmentsReturned,
        responseData
      );
    }

    const investments = await Transaction.aggregate(pipeline);

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestmentsReturned,
      investments
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const createSaleOld = async (req, res) => {
  try {
    const adminCheck = await isAdmin(req.data.role);
    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userIsNotAdmin
      );
    }
    const {
      saleId,
      startTime,
      endTime,
      tokenPrice,
      txnHash,
      blockNumber,
      blockHash,
      txnIndex,
    } = req.body;
    const saleExists = await Sale.findOne({ saleId });
    if (saleExists) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.saleAlreadyExists,
        null
      );
    }
    await Sale.updateMany({ active: true }, { active: false });
    const sale = await Sale.create({
      saleId,
      startTime,
      endTime,
      tokenPrice,
      txnHash,
      blockNumber,
      blockHash,
      txnIndex,
      active: true,
    });
    return httpResponse(res, statusCode.ok, true, message.saleCreated, sale);
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const createSale = async (req, res) => {
  try {
    const { name, startTime, endTime, tokenPrice } = req.body;
    const adminCheck = await isAdmin(req.data.role);
    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userIsNotAdmin
      );
    }

    const normalizedName = name.trim().toLowerCase();

    const existingSale = await Sale.findOne({ name: normalizedName });
    if (existingSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.SaleNameAlreadyExists
      );
    }

    // await Sale.updateMany({ active: true }, { active: false });
    const sale = await Sale.create({
      name: normalizedName,
      startTime,
      endTime,
      tokenPrice,
      active: true,
    });
    return httpResponse(res, statusCode.ok, true, message.saleCreated, sale);
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getSalesOld = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);

    const skip = (page - 1) * pageSize;

    let pipeline = [
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "saleId",
          as: "transactionDetails",
        },
      },
      {
        $lookup: {
          from: "tokenvestings",
          localField: "transactionDetails._id",
          foreignField: "txnId",
          as: "tokenVestingsDetails",
        },
      },
      {
        $unwind: {
          path: "$tokenVestingsDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id",
          saleDetails: { $first: "$$ROOT" },
          totalClaimedTokens: {
            $sum: { $ifNull: ["$tokenVestingsDetails.claimedTokens", 0] },
          },
          totalUnclaimedTokens: {
            $sum: { $ifNull: ["$tokenVestingsDetails.unclaimedTokens", 0] },
          },
          totalLockedTokens: {
            $sum: { $ifNull: ["$tokenVestingsDetails.lockedTokens", 0] },
          },
        },
      },
      {
        $addFields: {
          "saleDetails.distributionAnalytics": {
            totalClaimedTokens: "$totalClaimedTokens",
            totalUnclaimedTokens: "$totalUnclaimedTokens",
            totalLockedTokens: "$totalLockedTokens",
          },
        },
      },
      {
        $replaceRoot: {
          newRoot: "$saleDetails",
        },
      },
      { $sort: { created_at: -1 } },
      {
        $project: {
          tokenVestingsDetails: 0,
          transactionDetails: 0,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
      {
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
        },
      },
    ];

    const sales = await Sale.aggregate(pipeline);
    const paginatedData = sales[0]?.data || [];
    const totalCount = sales[0]?.totalCount || 0;

    const responseData = {
      page,
      pageSize,
      totalCount,
      sales: paginatedData,
    };
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allSalesReturned,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getSales = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);

    const skip = (page - 1) * pageSize;
    const sort = { createdAt: -1 };

    const {
      search: filterString,
      status: filterStatus,
      fromDate,
      toDate,
    } = req.query;
    const dateFilterColumn = "endTime";
    let whereClause = {};

    const searchByColumns = ["name"];
    if (filterString || filterStatus || fromDate || toDate) {
      const filters = {
        searchByColumns,
        dateFilterColumn,
        fromDate,
        toDate,
        filterString,
        whereClause,
        filterStatus,
      };
      whereClause = addFiltersToWhereClause(filters);
    }
    const sales = await Sale.find(whereClause)
      .sort(sort)
      .skip(skip)
      .limit(pageSize);
    console.log("whereClause: ", whereClause);
    const totalCount = await Sale.countDocuments(whereClause);

    const responseData = {
      page,
      pageSize,
      totalCount,
      sales,
    };
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allSalesReturned,
      responseData
    );
  } catch (error) {
    console.log("error: ", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getSale = async (req, res) => {
  try {
    const { id } = req.params;
    const sales = await Sale.findById(id);
    if (sales) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.allSalesReturned,
        sales
      );
    } else {
      return httpResponse(res, statusCode.ok, true, message.saleNotFound, {});
    }
  } catch (error) {
    console.log("error: ", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getTokenDetails = async (req, res) => {
  try {
    const token = await Token.findOne({});
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.tokenDetailsReturned,
      token
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const createToken = async (req, res) => {
  try {
    const payload = req.body;
    const token = await Token.create({ ...payload });
    return httpResponse(res, statusCode.ok, true, message.tokenCreated, token);
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getInvestorKyc = async (req, res) => {
  try {
    const { page, status } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    let investorCondition = { role: "INVESTOR" };
    if (req.query.investorId) {
      investorCondition = {
        role: "INVESTOR",
        _id: new mongoose.Types.ObjectId(req.query.investorId),
      };
    }

    if (status) {
      if (status == userStatus.KYC_SUCCESS) {
        investorCondition.isKycVerified = true;
      } else if (status == userStatus.KYC_REJECTED) {
        investorCondition.isKycRejected = true;
      } else {
        investorCondition.status = status;
      }
    }

    const kycData = await User.aggregate([
      {
        $match: investorCondition,
      },
      {
        $addFields: {
          investorWalletAddress: { $toLower: "$walletAddress" },
        },
      },
      {
        $lookup: {
          from: "privateaddresses",
          let: { investorWalletAddress: "$investorWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [
                    { $toLower: "$walletAddress" },
                    "$$investorWalletAddress",
                  ],
                },
              },
            },
          ],
          as: "isWhitelisted",
        },
      },
      {
        $lookup: {
          from: "blacklistaddresses",
          let: { userWallet: "$investorWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$walletAddress" }, "$$userWallet"],
                },
              },
            },
          ],
          as: "isBlacklisted",
        },
      },
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $size: "$isWhitelisted" }, 0] },
              { $eq: [{ $size: "$isBlacklisted" }, 0] },
            ],
          },
        },
      },
      {
        $lookup: {
          from: "kycs",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userId", "$$userId"],
                },
              },
            },
            {
              $sort: { createdAt: -1 },
            },
          ],
          as: "kyc",
        },
      },
      {
        $addFields: {
          isDocUploaded: {
            $cond: [{ $gt: [{ $size: "$kyc" }, 0] }, true, false],
          },
          latestKyc: {
            $ifNull: [
              {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$kyc",
                      as: "k",
                      cond: { $eq: ["$$k.isLatest", true] },
                    },
                  },
                  0,
                ],
              },
              { createdAt: new Date(0) }, // Default value if no KYC data exists
            ],
          },
        },
      },
      {
        $sort: { "latestKyc.createdAt": -1 },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          walletAddress: 1,
          status: 1,
          isKycVerified: 1,
          isKycRejected: 1,
          isDocUploaded: 1,
          sumsubApplicantId: 1,
          onchainId: 1,
          kyc: 1,
        },
      },
      {
        $facet: {
          metadata: [
            { $count: "totalCount" }, // Calculate total count of matching documents
          ],
          data: [
            { $skip: skip }, // Paginate results
            { $limit: pageSize }, // Limit results per page
          ],
        },
      },
      {
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] }, // Extract totalCount from metadata
        },
      },
    ]);

    console.log("🚀 ~ getInvestorKyc ~ kycData:", kycData);
    const paginatedData = kycData[0]?.data || [];
    const totalCount = kycData[0]?.totalCount || 0;

    const responseData = {
      page,
      pageSize,
      totalCount,
      kycData: paginatedData,
    };
    if (paginatedData.length) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.kycDataReturned,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getAllAddressWhitelist = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    const whitelistAddressList = await PrivateAddress.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    const totalCount = await PrivateAddress.countDocuments();
    const responseData = {
      page,
      pageSize,
      totalCount,
      whitelistAddressList,
    };
    if (totalCount) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.fetchWhitelistAddressSuccess,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getAllAddressBlacklist = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    const blacklistAddressList = await BlacklistAddress.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    const totalCount = await BlacklistAddress.countDocuments();
    const responseData = {
      page,
      pageSize,
      totalCount,
      blacklistAddressList,
    };
    if (totalCount) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.fetchBlacklistAddressSuccess,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getOneInvestorAllInvestments = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;
    const walletAddress = req.params.walletAddress.toLowerCase();
    if (!walletAddress) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.walletAddressRequired,
        {}
      );
    }

    const investor = await User.findOne({
      walletAddress: { $regex: `^${walletAddress}$`, $options: "i" },
    });
    if (!investor) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists,
        {}
      );
    }
    const investorDetails = { ...investor._doc };
    delete investorDetails.password;

    const isUserWhitelisted = await PrivateAddress.findOne({
      walletAddress: {
        $regex: `^${investorDetails.walletAddress}$`,
        $options: "i",
      },
    });
    const isUserBlacklisted = await BlacklistAddress.findOne({
      walletAddress: {
        $regex: `^${investorDetails.walletAddress}$`,
        $options: "i",
      },
    });
    investorDetails.isWalletAddressWhitelisted = !!isUserWhitelisted;
    investorDetails.isWalletAddressBlacklisted = !!isUserBlacklisted;

    const aggregatePipeline = [
      {
        $addFields: {
          from: { $toLower: "$from" }, // Normalize `from` field to lowercase
        },
      },
      {
        $match: {
          from: walletAddress, // Match with the normalized input address
        },
      },
      {
        $lookup: {
          from: "sales",
          localField: "saleId",
          foreignField: "_id",
          as: "saleDetails",
        },
      },
      {
        $unwind: {
          path: "$saleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $sort: { created_at: -1 } },
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
      {
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] }, // Extract totalCount from metadata
        },
      },
    ];

    const investorInvestments = await Transaction.aggregate(aggregatePipeline);

    const paginatedData = investorInvestments[0]?.data || [];
    const totalCount = investorInvestments[0]?.totalCount || 0;

    const responseData = {
      page,
      pageSize,
      totalCount,
      investorDetails,
      investorInvestments: paginatedData,
    };

    if (paginatedData.length) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.investorInvestmentsFetched,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getSaleStatistics = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    const aggregatePipeline = [
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "saleId",
          as: "transactionDetails",
        },
      },
      {
        $addFields: {
          analytics: {
            totalInvestments: { $size: "$transactionDetails" },
            totalValue: {
              $sum: {
                $map: {
                  input: "$transactionDetails",
                  as: "transaction",
                  in: "$$transaction.value",
                },
              },
            },
            totalTokenAmount: {
              $sum: {
                $map: {
                  input: "$transactionDetails",
                  as: "transaction",
                  in: "$$transaction.tokenAmount",
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          saleId: 1,
          startTime: 1,
          endTime: 1,
          active: 1,
          tokenPrice: 1,
          txnHash: 1,
          analytics: 1,
          transactionDetails: 1,
        },
      },
      {
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: pageSize }],
        },
      },
      {
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
        },
      },
    ];

    const saleStatistics = await Sale.aggregate(aggregatePipeline);
    const paginatedData = saleStatistics[0]?.data || [];
    const totalCount = saleStatistics[0]?.totalCount || 0;

    const responseData = {
      page,
      pageSize,
      totalCount,
      saleStatistics: paginatedData,
    };
    if (paginatedData.length) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.saleStatisticsFetchSuccess,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getUserAnalytics = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.params.userId);
    const user = await User.findById(userId);
    const condition = { role: "INVESTOR", _id: userId };
    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists,
        {}
      );
    }
    const aggregatePipeline = [
      {
        $match: condition,
      },
      {
        $addFields: {
          userWalletAddress: { $toLower: "$walletAddress" },
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { userWalletAddress: "$userWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$from" }, "$$userWalletAddress"],
                },
              },
            },
          ],
          as: "transactions",
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { userWalletAddress: "$userWalletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$from" }, "$$userWalletAddress"],
                },
              },
            },
            {
              $group: {
                _id: "$asset",
                totalAssetAmount: { $sum: "$assetAmount" },
              },
            },
            {
              $project: {
                asset: "$_id",
                totalAssetAmount: 1,
                _id: 0,
              },
            },
          ],
          as: "groupedByAsset",
        },
      },
      {
        $addFields: {
          groupedByTotalAssetAmount: {
            $arrayToObject: {
              $map: {
                input: "$groupedByAsset",
                as: "summary",
                in: { k: "$$summary.asset", v: "$$summary.totalAssetAmount" },
              },
            },
          },
        },
      },
      {
        $addFields: {
          totalTokensBought: { $sum: "$transactions.tokenAmount" },
          totalInvestments: { $size: "$transactions" },
        },
      },
      {
        $project: {
          groupedByTotalAssetAmount: 1,
          totalTokensBought: 1,
          totalInvestments: 1,
        },
      },
    ];

    const userAnalytics = await User.aggregate(aggregatePipeline);
    const responseData = {
      groupedByTotalAssetAmount: {},
      totalTokensBought: 0,
      totalInvestments: 0,
    };
    const distributionAnalytics = {
      totalClaimedTokens: 0,
      totalUnclaimedTokens: 0,
      totalTokens: 0,
    };
    const saleCount = Number(await rvaContract.methods.saleCount().call());

    for (let i = 1; i <= saleCount; i++) {
      const vestingData = await vestingContract.methods
        .getVestingDetails(i, user.walletAddress)
        .call();
      distributionAnalytics.totalClaimedTokens += Number(
        vestingData._claimedAmount
      );
      distributionAnalytics.totalTokens += Number(vestingData._totalAmount);
    }
    distributionAnalytics.totalUnclaimedTokens =
      distributionAnalytics.totalTokens -
      distributionAnalytics.totalClaimedTokens;
    responseData.distributionAnalytics = distributionAnalytics;

    if (userAnalytics.length) {
      responseData.groupedByTotalAssetAmount =
        userAnalytics[0]?.groupedByTotalAssetAmount || {};
      responseData.totalTokensBought = userAnalytics[0]?.totalTokensBought || 0;
      responseData.totalInvestments = userAnalytics[0]?.totalInvestments || 0;
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.userAnalyticsFetchSuccess,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const dashboard = async (req, res) => {
  try {
    const totalInvestors = await User.countDocuments({ role: "INVESTOR" });
    const recentTransactions = await Transaction.find()
      .sort({ created_at: -1 })
      .limit(10);
    const saleCount = Number(await rvaContract.methods.saleCount().call());
    const distributionAnalytics = {
      totalClaimedTokens: 0,
      totalUnclaimedTokens: 0,
      totalTokens: 0,
    };
    const investors = await Transaction.aggregate([
      {
        $group: {
          _id: "$from",
        },
      },
      {
        $project: {
          _id: 0,
          investorAddress: "$_id",
        },
      },
    ]);

    let totalFundRaised = BigInt(0);
    for (let i = 1; i <= saleCount; i++) {
      const sale = await rvaContract.methods.sales(i).call();
      totalFundRaised += BigInt(sale[7]);
      for (const investor of investors) {
        const vestingData = await vestingContract.methods
          .getVestingDetails(i, investor.investorAddress)
          .call();
        distributionAnalytics.totalClaimedTokens += Number(
          vestingData._claimedAmount
        );
        distributionAnalytics.totalTokens += Number(vestingData._totalAmount);
      }
    }
    distributionAnalytics.totalUnclaimedTokens =
      distributionAnalytics.totalTokens -
      distributionAnalytics.totalClaimedTokens;
    const responseData = {
      totalInvestors,
      totalFundRaised: totalFundRaised.toString(),
      distributionAnalytics,
      recentTransactions,
    };
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.dashboardDataFetchSuccess,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getDistributionAnalytics = async (req, res) => {
  try {
    const { saleId } = req.params;
    const tokenAnalytics = await Transaction.aggregate([
      {
        $match: {
          saleId: new mongoose.Types.ObjectId(saleId),
        },
      },
      {
        $lookup: {
          from: "tokenvestings",
          localField: "_id",
          foreignField: "txnId",
          as: "tokenVestingsDetails",
        },
      },
      {
        $unwind: {
          path: "$tokenVestingsDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: null,
          totalClaimedTokens: { $sum: "$tokenVestingsDetails.claimedTokens" },
          totalUnclaimedTokens: {
            $sum: "$tokenVestingsDetails.unclaimedTokens",
          },
          totalLockedTokens: { $sum: "$tokenVestingsDetails.lockedTokens" },
        },
      },
    ]);
    const responseData = {
      totalClaimedTokens: 0,
      totalUnclaimedTokens: 0,
      totalLockedTokens: 0,
    };
    if (!tokenAnalytics.length) {
      return httpResponse(
        res,
        statusCode.ok,
        false,
        message.noRecordFound,
        responseData
      );
    }
    responseData.totalClaimedTokens =
      tokenAnalytics[0]?.totalClaimedTokens || 0;
    responseData.totalUnclaimedTokens =
      tokenAnalytics[0]?.totalUnclaimedTokens || 0;
    responseData.totalLockedTokens = tokenAnalytics[0]?.totalLockedTokens || 0;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.distributionAnalyticsFetchSuccess,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const updateInvestorKycStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;
    const investorId = new mongoose.Types.ObjectId(req.params.id);
    const investor = await User.findById(investorId);
    const statusHistory = {
      status: investor.status,
      timestamp: Date.now(),
      reason: "",
    };
    let isKycVerified;
    let isKycRejected;
    let reviewStatus;
    const rejectionReason = reason || null;
    if (status === userStatus.KYC_SUCCESS) {
      isKycVerified = true;
      isKycRejected = false;
      reviewStatus = "approved";
      const isVerified = await verifyKyc(investor.walletAddress);
      if (isVerified) {
        await PrivateAddress.deleteOne({
          walletAddress: {
            $regex: `^${investor.walletAddress}$`,
            $options: "i",
          },
        });
        await BlacklistAddress.deleteOne({
          walletAddress: {
            $regex: `^${investor.walletAddress}$`,
            $options: "i",
          },
        });
      } else {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.kycStatusUpdateError,
          {}
        );
      }
      await sendEmail(investor.email, emailTemplateId.investorKycSuccess, {
        user_name: investor.name,
      });
    } else if (status === userStatus.KYC_REJECTED) {
      isKycVerified = false;
      isKycRejected = true;
      reviewStatus = "rejected";
      await sendEmail(investor.email, emailTemplateId.investorKycReject, {
        user_name: investor.name,
        reject_reason: rejectionReason,
      });
    }
    await User.updateOne(
      { _id: investorId },
      {
        $push: { statusHistory: statusHistory },
        $set: { status, isKycVerified, isKycRejected },
      }
    );
    await Kyc.updateMany(
      { userId: investorId, isLatest: true },
      { isKycVerified, rejectionReason, reviewStatus, lastUpdated: new Date() }
    );
    return httpResponse(res, statusCode.ok, true, message.kycStatusUpdated, {});
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const updateInvestorOnchainId = async (req, res) => {
  try {
    const investorId = new mongoose.Types.ObjectId(req.params.userId);
    const investor = await User.findById(investorId);
    if (!investor) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists,
        {}
      );
    }
    if (!investor.isKycVerified) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.kycNotVerified,
        {}
      );
    }
    const { onchainId } = req.body;
    await User.findByIdAndUpdate(investorId, {
      onchainId,
    });
    return httpResponse(res, statusCode.ok, true, message.onchainIdUpdated, {});
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getClaimTokenHistory = async (req, res) => {
  try {
    const { page, investorAddress } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;
    const query = {};
    if (investorAddress) {
      query.investorAddress = { $regex: `^${investorAddress}$`, $options: "i" };
    }
    const claimTokenHistory = await TokenClaimHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    const totalCount = await TokenClaimHistory.countDocuments();
    const responseData = {
      page,
      pageSize,
      totalCount,
      claimTokenHistory,
    };
    if (totalCount) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.fetchTokenClaimHistorySuccess,
        responseData
      );
    }
    return httpResponse(
      res,
      statusCode.ok,
      false,
      message.noRecordFound,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const PRECISION_18 = 1e18;
const ECT_PRICE_MULTIPLIER = 1e18;
const txHashMaxLength = 12;
const formatTxHash = (txHash) => {
  const hash = String(txHash);
  if (hash.length <= txHashMaxLength) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
};

const formatAssetAmount = (assetAmount, asset) => {
  let assetAmountFormatted = (Number(assetAmount) / PRECISION_18).toFixed(5);
  if (asset === "BNB") {
    assetAmountFormatted = (Number(assetAmount) / PRECISION_18).toFixed(18);
  }
  return `${assetAmountFormatted} ${asset}`;
};

const downloadInvestments = async (req, res) => {
  try {
    const investmentPipeline = [
      { $sort: { created_at: -1 } },
      {
        $project: {
          txnHash: 1,
          from: 1,
          value: 1,
          tokenAmount: 1,
          tokenPrice: 1,
          saleId: 1,
          asset: 1,
          assetAmount: 1,
          created_at: 1,
        },
      },
    ];
    const transactions = await Transaction.aggregate(investmentPipeline);
    const headers = [
      "Tx Hash",
      "Tokens Bought With",
      "Token Amount",
      "Token Price",
      "Time",
    ];

    const rows = transactions.map((transaction) => ({
      ["Tx Hash"]: formatTxHash(transaction.txnHash),
      ["Tokens Bought With"]: formatAssetAmount(
        transaction.assetAmount,
        transaction.asset
      ),
      ["Token Amount"]: transaction.tokenAmount / ECT_PRICE_MULTIPLIER,
      ["Token Price"]: `$${transaction.tokenPrice / ECT_PRICE_MULTIPLIER}`,
      ["Time"]: moment(transaction.created_at).format("DD/MM/YYYY, HH:mm:ss"),
    }));
    await Promise.all(rows);
    const pdfBuffer = generatePDF({
      headers,
      rows,
      title: "Investments Transaction",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="InvestmentsTransactions.pdf"'
    );
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const adminCheck = await isAdmin(req.data.role);

    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.unAuthorized,
        false,
        message.userIsNotAdmin
      );
    }
    const userId = req.params.id;
    const user = await User.findById(userId);
    if (!user) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userDoesnotExists,
        {}
      );
    }

    const userData = req.body;
    if (userData?.isBlocked == user.isBlocked) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.noChangeDetected,
        {}
      );
    }
    let statusData;
    let responseMessage;
    if (userData.isBlocked) {
      statusData = {
        status: "BLOCKED",
        timestamp: Date.now(),
        reason: userData.reason,
      };
      responseMessage = message.profileUpdateSuccess;
    } else if (!userData.isBlocked) {
      statusData = {
        status: "UNBLOCKED",
        timestamp: Date.now(),
        reason: userData.reason,
      };
      responseMessage = message.profileUpdateSuccess;
    }
    user.isBlocked = userData?.isBlocked || user.isBlocked;
    user.statusHistory.push(statusData);
    user.status = statusData.status;

    await user.save();

    return httpResponse(res, statusCode.ok, true, responseMessage);
  } catch (error) {
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const updateTransactionStatus = async (req, res) => {
  try {
    const adminCheck = await isAdmin(req.data.role);

    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.unAuthorized,
        false,
        message.userIsNotAdmin
      );
    }
    
  } catch (error) {
    console.log("error here ===>", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  setAdminAddress,
  getInvestors,
  getAllInvestments,
  createSale,
  getSales,
  getSale,
  getTokenDetails,
  createToken,
  getInvestorKyc,
  getAllAddressWhitelist,
  getOneInvestorAllInvestments,
  getSaleStatistics,
  getUserAnalytics,
  dashboard,
  getDistributionAnalytics,
  updateInvestorKycStatus,
  getAllAddressBlacklist,
  updateInvestorOnchainId,
  getClaimTokenHistory,
  downloadInvestments,
  updateUserStatus,
};
