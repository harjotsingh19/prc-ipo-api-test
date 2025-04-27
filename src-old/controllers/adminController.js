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

const moment = require("moment");
const { sendEmail } = require("../utils/mailManager");

const getInvestors = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, investorId, isBlocked } = req.query;
    console.log(
      "🚀 ~ getInvestors ~ investorId:",
      investorId,
      "isBlocked:",
      isBlocked
    );

    const skip = (page - 1) * pageSize;

    // Define the base condition to filter only investors
    let condition = { role: "INVESTOR", isEmailVerified: true };

    if (investorId) {
      condition._id = new mongoose.Types.ObjectId(`${investorId}`);
    }

    if (isBlocked !== undefined) {
      condition.isBlocked = isBlocked === "true";
    }

    console.log("condition ", condition);

    const aggregatePipeline = [
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "transactions",
          localField: "_id",
          foreignField: "userId",
          as: "transactions",
        },
      },
      {
        $addFields: {
          tokenIn: {
            $sum: {
              $map: {
                input: "$transactions.tokenIn", // Map over tokenIn values
                as: "token",
                in: { $toDouble: "$$token" },
              },
            },
          },
          tokenOut: {
            $sum: {
              $map: {
                input: "$transactions.tokenOut",
                as: "usd",
                in: { $toDouble: "$$usd" },
              },
            },
          },
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          walletAddress: 1,
          isBlocked: 1,
          tokenIn: 1,
          tokenOut: 1,
          "transactions.paymentId": 1,
          "transactions.tokenIn": 1,
          "transactions.tokenOut": 1,
          "transactions.paymentStatus": 1,
          "transactions.transactionDate": 1,
        },
      },
    ];

    if (!investorId) {
      aggregatePipeline.push({
        $facet: {
          metadata: [{ $count: "totalCount" }],
          data: [{ $skip: skip }, { $limit: parseInt(pageSize) }],
        },
      });
      aggregatePipeline.push({
        $addFields: {
          totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
        },
      });
    }

    const investors = await User.aggregate(aggregatePipeline).exec();

    let responseData;
    if (investorId && investors.length) {
      responseData = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount: 1,
        investor: investors[0],
      };
    } else {
      const paginatedData = investors[0]?.data || [];
      const totalCount = investors[0]?.totalCount || 0;
      responseData = {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        investors: paginatedData,
      };
    }

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
    const pipeline = [
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
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $sort: { created_at: -1 },
      },
      {
        $project: {
          paymentIntentId: 1,
          tokenIn: 1,
          tokenOut: 1,
          paymentStatus: 1,
          paymentType: 1,
          transactionDate: 1,
          saleId: 1,
          "saleDetails.name": 1,
          "saleDetails.startTime": 1,
          "saleDetails.endTime": 1,
          "userDetails.firstName": 1,
          "userDetails.lastName": 1,
          "userDetails.email": 1,
        },
      },
    ];

    if (saleId) {
      pipeline.push({
        $match: { saleId: new mongoose.Types.ObjectId(`${saleId}`) },
      });
    }

    if (filter === "last10") {
      pipeline.push({ $sort: { transactionDate: 1 } }, { $limit: 10 });
    } else if (filter === "top10") {
      pipeline.push({ $sort: { transactionDate: -1 } }, { $limit: 10 });
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

      const investments = await Transaction.aggregate(pipeline).exec();
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

    const investments = await Transaction.aggregate(pipeline).exec();
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
const getInvestmentDetails = async (req, res) => {
  try {
    const { id } = req.params; // Extract transaction ID from request parameters
    const transactionId = id; // Assign the transaction ID

    if (!transactionId) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.transactionIdRequired
      );
    }

    // Aggregation pipeline to fetch transaction details
    const transactionDetails = await Transaction.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${transactionId}`), // Match the transaction ID
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sales", // Join with the Sale collection
          localField: "saleId",
          foreignField: "_id",
          as: "saleDetails",
        },
      },
      {
        $unwind: {
          path: "$saleDetails", // Unwind the saleDetails array
          preserveNullAndEmptyArrays: true, // Keep documents even if saleDetails is null
        },
      },
      {
        $project: {
          paymentIntentId: 1,
          tokenIn: 1,
          tokenOut: 1,
          paymentStatus: 1,
          paymentType: 1,
          transactionDate: 1,
          "userDetails.firstName": 1,
          "userDetails.lastName": 1,
          "userDetails.email": 1,
          "saleDetails.name": 1,
          "saleDetails.startTime": 1,
          "saleDetails.endTime": 1,
        },
      },
    ]).exec();

    if (!transactionDetails.length) {
      return httpResponse(
        res,
        statusCode.notFound,
        false,
        message.transactionNotFound
      );
    }

    console.log(
      "🚀 ~ getInvestmentDetails ~ transactionDetails:",
      transactionDetails
    );

    // Return the transaction details
    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.transactionDetailsFetched,
      transactionDetails[0]
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
    const saleExists = await Sale.findOne({ saleId }).exec();
    if (saleExists) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.saleAlreadyExists,
        null
      );
    }
    await Sale.updateMany({ active: true }, { active: false }).exec();
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

    const existingSale = await Sale.findOne({ name: normalizedName }).exec();
    if (existingSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.SaleNameAlreadyExists
      );
    }

    const sale = await Sale.create({
      name: normalizedName,
      startTime,
      endTime,
      tokenPrice,
      active: false,
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

    const sales = await Sale.aggregate(pipeline).exec();
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

    let {
      search: filterString,
      status: filterStatus,
      fromDate,
      toDate,
    } = req.query;

    filterStatus = filterStatus === "true";

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

    console.log("filterStatus: ", filterStatus, typeof filterStatus);

    const sales = await Sale.find(whereClause)
      .sort(sort)
      .skip(skip)
      .limit(pageSize)
      .exec();
    console.log("whereClause: ", whereClause);
    const totalCount = await Sale.countDocuments(whereClause).exec();

    const responseData = {
      page,
      pageSize,
      totalCount,
      sales,
    };

    if (filterStatus === true) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.SaleDataReturned,
        responseData
      );
    }
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
    const sales = await Sale.findById(id).exec();
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
    const token = await Token.findOne({}).exec();
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

const getAllAddressWhitelist = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;

    const whitelistAddressList = await PrivateAddress.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();
    const totalCount = await PrivateAddress.countDocuments().exec();
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
    }).exec();
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
    }).exec();
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

    const investorInvestments = await Transaction.aggregate(
      aggregatePipeline
    ).exec();

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

    const saleStatistics = await Sale.aggregate(aggregatePipeline).exec();
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
    const userId = new mongoose.Types.ObjectId(`${req.params.userId}`);
    const user = await User.findById(userId).exec();
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

    const userAnalytics = await User.aggregate(aggregatePipeline).exec();
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
    const totalInvestors = await User.countDocuments({
      role: "INVESTOR",
    }).exec();
    const recentTransactions = await Transaction.find()
      .sort({ created_at: -1 })
      .limit(10);

    const distributionAnalytics = {
      totalClaimedTokens: 0,
      // totalUnclaimedTokens: 0,
      // totalTokens: 0,
    };
    let totalFundRaised = BigInt(0);
    const token = await Token.findOne();
    if (token) {
      totalFundRaised = token?.fundsRaised;
      // distributionAnalytics.totalTokens = token?.totalSupply;
      distributionAnalytics.totalClaimedTokens = token?.claimedTokens;
      // distributionAnalytics.totalUnclaimedTokens = token?.availableTokens;
    }

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
          saleId: new mongoose.Types.ObjectId(`${saleId}`),
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
    ]).exec();
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
    const investorId = new mongoose.Types.ObjectId(`${req.params.userId}`);
    const investor = await User.findById(investorId).exec();
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
        }).exec();
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
    ).exec();
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
    const investorId = new mongoose.Types.ObjectId(`${req.params.userId}`);
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
    }).exec();
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
      .limit(pageSize)
      .exec();
    const totalCount = TokenClaimHistory.countDocuments();
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
    const transactions = await Transaction.aggregate(investmentPipeline).exec();
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
    let responseMessage;
    if (userData.isBlocked) {
      responseMessage = message.userBlockSuccess;
      user.isBlocked = true;
    } else if (!userData.isBlocked) {
      responseMessage = message.userUnblockSuccess;
      user.isBlocked = false;
    }

    await user.save();

    return httpResponse(res, statusCode.ok, true, responseMessage);
  } catch (error) {
    console.log("error here ===>", error);
  }
  return httpResponse(res, statusCode.errorPage, false, error.message);
};

const transactions = async (req, res) => {
  try {
    const { page, investorAddress } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;
    const query = {};

    const recentTransactions = await Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize);
    const totalCount = await Transaction.countDocuments();
    const responseData = {
      page,
      pageSize,
      totalCount,
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

const getSalesAirDropTransactions = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const saleId = req.params.id;

    const skip = (page - 1) * pageSize;
    let whereClause = {
      saleId: new ObjectId(saleId),
      paymentStatus: "Paid",
      paymentTokenOutStatus: false,
    };

    const transactionsData = await Transaction.aggregate([
      { $match: whereClause },
      {
        $lookup: {
          from: "users",
          localField: "transactions.userId",
          foreignField: "_id",
          as: "transactions.userDetails",
        },
      },
      {
        $unwind: {
          path: "$transactions.userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "sales",
          localField: "transactions.saleId",
          foreignField: "_id",
          as: "transactions.saleDetails",
        },
      },
      {
        $unwind: {
          path: "$transactions.saleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "transactions._id": 1,
          "transactions.paymentId": 1,
          "transactions.tokenOut": 1,
          "transactions.tokenIn": 1,
          "transactions.paymentStatus": 1,
          "transactions.saleId": 1,
          "transactions.created_at": 1,
          "transactions.saleDetails._id": 1,
          "transactions.saleDetails.name": 1,
          "transactions.saleDetails.startTime": 1,
          "transactions.saleDetails.endTime": 1,
          "transactions.saleDetails.tokenPrice": 1,
          "transactions.userDetails._id": 1,
          "transactions.userDetails.email": 1,
          "transactions.userDetails.lastName": 1,
          "transactions.userDetails.firstName": 1,
          "transactions.userDetails.walletAddress": 1,
        },
      },
      { $skip: skip }, // 👈 Pagination: Skip X documents
      { $limit: pageSize }, // 👈 Pagination: Limit to pageSize
    ]);

    // 4. Optional total count for frontend
    const totalTransactions = await Transaction.countDocuments(
      condition
    ).exec();

    const responseData = {
      page,
      pageSize,
      totalTransactions,
      transactionsData,
    };

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allTransactionReturned,
      responseData
    );
  } catch (error) {
    console.log("error: ", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const updateSalesAirDropTransactions = async (req, res) => {
  try {
    const { userIds, saleId } = req.body;

    const transactionsData = await Transaction.updateMany(
      { userId: { $in: userIds }, saleId: new ObjectId(saleId) },
      { paymentTokenOutStatus: true }
    );

    if (transactionsData.modifiedCount === transactionsData.matchedCount) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.allSalesReturned,
        {}
      );
    }

    return httpResponse(
      res,
      statusCode.badRequest,
      true,
      message.allTransactionUpdated,
      {}
    );
  } catch (error) {
    console.log("error: ", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  getInvestors,
  getAllInvestments,
  getInvestmentDetails,
  createSale,
  getSales,
  getSale,
  getTokenDetails,
  createToken,
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
  transactions,
  transactions,
  getSalesAirDropTransactions,
  updateSalesAirDropTransactions,
};
