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
                input: "$transactions.tokenIn",
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
      // {
      //   $sort: { created_at: -1 },
      // },
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
    console.log("🚀 ~ getInvestmentDetails ~ transactionId:", transactionId);

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
        statusCode.badRequest,
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

    // const normalizedName = name.trim().toLowerCase();

    // const existingSale = await Sale.findOne({ name: normalizedName }).exec();
    const existingSale = await Sale.findOne({ name }).exec();

    if (existingSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.SaleNameAlreadyExists
      );
    }

    const sale = await Sale.create({
      name,
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

const getSales = async (req, res) => {
  try {
    console.log("get sales");

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
      distributionAnalytics.totalClaimedTokens = token?.claimedTokens;
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
    console.log("🚀 ~ updateUserStatus ~ user:", user);
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

    let incomingIsBlocked = userData?.isBlocked;

    if (typeof incomingIsBlocked === "string") {
      incomingIsBlocked = incomingIsBlocked === "true";
    }

    if (incomingIsBlocked === user.isBlocked) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.noChangeDetected,
        {}
      );
    }

    let responseMessage;
    if (incomingIsBlocked) {
      responseMessage = message.userBlockSuccess;
      user.isBlocked = true;
    } else if (!incomingIsBlocked) {
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
  getOneInvestorAllInvestments,
  getSaleStatistics,
  dashboard,
  updateUserStatus,
  transactions,
  getSalesAirDropTransactions,
  updateSalesAirDropTransactions,
};
