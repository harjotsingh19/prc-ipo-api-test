const User = require("../models/User");
const Sale = require("../models/Sale");
const Token = require("../models/Token");
const { ethers } = require("ethers");

const { httpResponse } = require("../middleware/responseHandler");
const { isAdmin, addFiltersToWhereClause } = require("../utils/helper");
const { transferFunds } = require("../utils/blockchain");
const { generatePDF } = require("../utils/pdfManager");
const {
  statusCode,
  message,
  status: userStatus,
  emailTemplateId,
} = require("../config/constants");
const { default: mongoose } = require("mongoose");
const Transaction = require("../models/Transaction");

const moment = require("moment");
const { sendEmail, sendEmailToMultipleUsers } = require("../utils/mailManager");

const getInvestors = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      isBlocked,
      sortBy,
      sortOrder,
      search,
    } = req.query;

    const skip = (page - 1) * pageSize;

    let condition = { role: "INVESTOR", isEmailVerified: true };

    if (isBlocked !== undefined) {
      condition.isBlocked = isBlocked === "true";
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      condition.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { walletAddress: searchRegex },
      ];
    }

    const aggregatePipeline = [
      { $match: condition },
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
                as: "token",
                in: { $toDouble: "$$token" },
              },
            },
          },
        },
      },
    ];

    if (sortBy) {
      const sortDirection = sortOrder === "desc" ? -1 : 1;
      const sortStage = {};
      sortStage[sortBy] = sortDirection;
      aggregatePipeline.push({ $sort: sortStage });
    }

    aggregatePipeline.push({
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
    });

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

    const investors = await User.aggregate(aggregatePipeline).exec();
    const paginatedData = investors[0]?.data || [];
    const totalCount = investors[0]?.totalCount || 0;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestorsReturned,
      {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalCount,
        investors: paginatedData,
      }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getInvestorById = async (req, res) => {
  try {
    const {
      investorId,
      sortBy = "transactionDate",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    if (!investorId) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        "Investor ID is required."
      );
    }

    const sortField = ["tokenIn", "tokenOut", "transactionDate"].includes(
      sortBy
    )
      ? sortBy
      : "transactionDate"; // default fallback

    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    const investor = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(investorId),
          role: "INVESTOR",
          isEmailVerified: true,
        },
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
                input: "$transactions",
                as: "tran",
                in: { $toDouble: "$$tran.tokenIn" },
              },
            },
          },
          tokenOut: {
            $sum: {
              $map: {
                input: "$transactions",
                as: "tran",
                in: { $toDouble: "$$tran.tokenOut" },
              },
            },
          },
        },
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
          transactions: 1,
        },
      },
    ]);

    if (!investor.length) {
      return httpResponse(
        res,
        statusCode.notFound,
        false,
        "Investor not found."
      );
    }

    let investorData = investor[0];

    let sortedTransactions = investorData.transactions || [];

    sortedTransactions.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (sortField === "tokenIn" || sortField === "tokenOut") {
        aValue = parseFloat(aValue || 0);
        bValue = parseFloat(bValue || 0);
      }

      if (sortField === "transactionDate") {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (sortDirection === 1) {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const totalTransactions = sortedTransactions.length;
    const paginatedTransactions = sortedTransactions.slice(
      skip,
      skip + limitNum
    );

    investorData.transactions = paginatedTransactions;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      "Investor returned successfully",
      {
        investor: investorData,
        pagination: {
          totalTransactions,
          page: parseInt(page),
          limit: limitNum,
          totalPages: Math.ceil(totalTransactions / limitNum),
        },
      }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const {
      filter,
      page = 1,
      saleId,
      search,
      sortBy = "transactionDate",
      sortOrder = "desc",
      pageSize = 10,
    } = req.query;

    const sortField = ["transactionDate", "tokenIn", "tokenOut"].includes(
      sortBy
    )
      ? sortBy
      : "transactionDate";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);

    const pipeline = [
      {
        $lookup: {
          from: "sales",
          localField: "saleId",
          foreignField: "_id",
          as: "saleDetails",
        },
      },
      { $unwind: { path: "$saleDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ];

    if (saleId) {
      pipeline.push({
        $match: { saleId: new mongoose.Types.ObjectId(`${saleId}`) },
      });
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      pipeline.push({
        $match: {
          $or: [
            { "userDetails.firstName": { $regex: searchRegex } },
            { "userDetails.lastName": { $regex: searchRegex } },
            { "userDetails.email": { $regex: searchRegex } },
            { "saleDetails.name": { $regex: searchRegex } },
          ],
        },
      });
    }

    if (filter === "last10") {
      pipeline.push(
        { $sort: { transactionDate: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            paymentIntentId: 1,
            tokenIn: 1,
            tokenOut: 1,
            paymentStatus: 1,
            paymentType: 1,
            transactionDate: 1,
            saleId: 1,
            "saleDetails.name": 1,
            "saleDetails.startDate": 1,
            "saleDetails.endDate": 1,
            "userDetails.firstName": 1,
            "userDetails.lastName": 1,
            "userDetails.email": 1,
          },
        }
      );
    } else if (filter === "top10") {
      pipeline.push(
        { $sort: { transactionDate: -1 } },
        { $limit: 10 },
        {
          $project: {
            _id: 0,
            paymentIntentId: 1,
            tokenIn: 1,
            tokenOut: 1,
            paymentStatus: 1,
            paymentType: 1,
            transactionDate: 1,
            saleId: 1,
            "saleDetails.name": 1,
            "saleDetails.startDate": 1,
            "saleDetails.endDate": 1,
            "userDetails.firstName": 1,
            "userDetails.lastName": 1,
            "userDetails.email": 1,
          },
        }
      );
    } else {
      if (["tokenIn", "tokenOut"].includes(sortField)) {
        pipeline.push({
          $addFields: {
            numericTokenIn: { $toDouble: "$tokenIn" },
            numericTokenOut: { $toDouble: "$tokenOut" },
          },
        });
      }

      pipeline.push(
        {
          $sort: {
            [sortField === "tokenIn"
              ? "numericTokenIn"
              : sortField === "tokenOut"
              ? "numericTokenOut"
              : sortField]: sortDirection,
          },
        },
        {
          $facet: {
            metadata: [{ $count: "totalCount" }],
            data: [
              { $skip: skip },
              { $limit: parseInt(pageSize) },
              {
                $project: {
                  _id: 0,
                  paymentIntentId: 1,
                  tokenIn: 1,
                  tokenOut: 1,
                  paymentStatus: 1,
                  paymentType: 1,
                  transactionDate: 1,
                  saleId: 1,
                  "saleDetails.name": 1,
                  "saleDetails.startDate": 1,
                  "saleDetails.endDate": 1,
                  "saleDetails.tokenPrice": 1,
                  "userDetails.firstName": 1,
                  "userDetails.lastName": 1,
                  "userDetails.email": 1,
                },
              },
            ],
          },
        },
        {
          $addFields: {
            totalCount: { $arrayElemAt: ["$metadata.totalCount", 0] },
          },
        }
      );
    }

    const investments = await Transaction.aggregate(pipeline).exec();

    if (filter === "last10" || filter === "top10") {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.allInvestmentsReturned,
        investments
      );
    }

    const paginatedData = investments[0]?.data || [];
    const totalCount = investments[0]?.totalCount || 0;

    const responseData = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
      investments: paginatedData,
    };

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestmentsReturned,
      responseData
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getInvestmentDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      search,
      sortBy = "transactionDate",
      sortOrder = "desc",
    } = req.query;

    const matchStage = [];

    if (id) {
      matchStage.push({
        _id: new mongoose.Types.ObjectId(id),
      });
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      matchStage.push({
        $or: [
          { "userDetails.firstName": { $regex: searchRegex } },
          { "userDetails.lastName": { $regex: searchRegex } },
          { "userDetails.email": { $regex: searchRegex } },
          { "saleDetails.name": { $regex: searchRegex } },
        ],
      });
    }

    const sortField = ["transactionDate", "tokenIn", "tokenOut"].includes(
      sortBy
    )
      ? sortBy
      : "transactionDate";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const transactionDetails = await Transaction.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "sales",
          localField: "saleId",
          foreignField: "_id",
          as: "saleDetails",
        },
      },
      { $unwind: { path: "$saleDetails", preserveNullAndEmptyArrays: true } },
      {
        $match: matchStage.length > 0 ? { $and: matchStage } : {},
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
          "saleDetails.startDate": 1,
          "saleDetails.endDate": 1,
        },
      },
      { $sort: { [sortField]: sortDirection } },
    ]).exec();

    if (!transactionDetails.length) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.transactionNotFound
      );
    }

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.transactionDetailsFetched,
      transactionDetails.length === 1
        ? transactionDetails[0]
        : transactionDetails
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const createSale = async (req, res) => {
  try {
    const { name, startDate, endDate, tokenPrice } = req.body;

    const adminCheck = await isAdmin(req.data.role);
    if (!adminCheck) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.userIsNotAdmin
      );
    }

    const existingSale = await Sale.findOne({ name }).exec();
    if (existingSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.SaleNameAlreadyExists
      );
    }

    const activeSale = await Sale.findOne({
      active: true,
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    }).exec();

    if (activeSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.ActiveSaleAlreadyExists
      );
    }

    const futureSale = await Sale.findOne({
      active: false,
      $or: [{ startDate: { $lte: endDate }, endDate: { $gte: startDate } }],
    }).exec();

    if (futureSale) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.FutureSaleOverlapError
      );
    }

    const sale = await Sale.create({
      name,
      startDate,
      endDate,
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

    const dateFilterColumn = "endDate";
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
          startDate: 1,
          endDate: 1,
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
    const { page } = req.query;
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
    const { page = 1 } = req.query; // Default page is 1 if not provided
    const pageSize = parseInt(req.query.pageSize) || 10; // Default pageSize is 10 if not provided
    const saleId = req.params.id;

    const skip = (page - 1) * pageSize;

    // Define the where clause for filtering transactions
    const whereClause = {
      saleId: new mongoose.Types.ObjectId(`${saleId}`),
      paymentStatus: "Paid",
      paymentTokenOutStatus: false,
    };

    // Fetch transactions with wallet addresses, sale details, and token info
    const transactionsData = await Transaction.aggregate([
      {
        $match: {
          saleId: new mongoose.Types.ObjectId(`${saleId}`),
          paymentStatus: "Paid",
          paymentTokenOutStatus: false,
        },
      }, // Match the conditions
      {
        $lookup: {
          from: "users", // Join with the Users collection
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
        $match: {
          "userDetails.walletAddress": { $nin: [null, ""] }, // Filter out empty/null walletAddress
        },
      },
      {
        $lookup: {
          from: "sales", // Join with the Sales collection
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
          _id: 1,
          saleId: 1,
          paymentStatus: 1,
          paymentTokenOutStatus: 1,
          tokenIn: 1,
          tokenOut: 1,
          "userDetails.walletAddress": 1,
          "userDetails.email": 1,
          "userDetails.firstName": 1,
          "userDetails.lastName": 1,
          "saleDetails.name": 1,
          "saleDetails.startDate": 1,
          "saleDetails.endDate": 1,
          "saleDetails.tokenPrice": 1,
        },
      },
      { $skip: skip },
      { $limit: pageSize },
    ]);

    let amounts = [];
    let receivers = [];
    let transactionIds = [];
    let receiversData = [];

    if (transactionsData.length) {
      transactionsData.forEach((transaction) => {
        if (transaction?.tokenIn && transaction.userDetails?.walletAddress) {
          transactionIds.push(transaction._id);
          amounts.push(ethers.parseUnits(transaction.tokenIn, 18));
          receivers.push(transaction.userDetails.walletAddress);
          receiversData.push({
            email: transaction.userDetails?.email,
            user_name: transaction.userDetails?.firstName,
            wallet_address: transaction.userDetails.walletAddress,
            amount: transaction.tokenIn,
          });
        }
      });
    }
    if (amounts.length === receivers.length) {
      const hash = await transferFunds(amounts, receivers);
      await sendAirdropConfirmationMail(receiversData, hash);
      if (!hash) {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.ErrorWhileTransferFunds
        );
      }
      const updatedTransactionsData = await Transaction.updateMany(
        { _id: { $in: transactionIds } },
        { paymentTokenOutStatus: true, paymentHash: hash }
      );

      if (
        updatedTransactionsData.modifiedCount ===
        updatedTransactionsData.matchedCount
      ) {
        return httpResponse(
          res,
          statusCode.ok,
          true,
          message.allTransactionReturned,
          {}
        );
      } else {
        return httpResponse(
          res,
          statusCode.badRequest,
          false,
          message.ErrorWhileTransferFunds
        );
      }
    }
    return httpResponse(
      res,
      statusCode.badRequest,
      false,
      message.ErrorWhileTransferFunds
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

const downloadInvestments = async (req, res) => {
  try {
    const investmentPipeline = [
      { $sort: { created_at: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $lookup: {
          from: "sales",
          localField: "saleId",
          foreignField: "_id",
          as: "sale",
        },
      },
      {
        $unwind: { path: "$user", preserveNullAndEmptyArrays: true },
      },
      {
        $unwind: { path: "$sale", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          paymentIntentId: 1,
          tokenIn: 1,
          tokenOut: 1,
          transactionDate: 1,
          created_at: 1,
          "user.email": 1,
          "sale.name": 1,
          "sale.tokenPrice": 1,
        },
      },
    ];

    const transactions = await Transaction.aggregate(investmentPipeline);
    console.log("🚀 ~ downloadInvestments ~ transactions:", transactions);

    const headers = [
      "Payment ID",
      "User Email",
      "Sale Name",
      "Tokens",
      "Amount Paid",
      "Transaction Date",
    ];

    const rows = transactions.map((transaction) => ({
      ["Payment ID"]: transaction.paymentIntentId || "-",
      ["User Email"]: transaction.user?.email || "-",
      ["Sale Name"]: transaction.sale?.name || "-",
      ["Tokens"]: transaction.tokenIn || 0,
      ["Amount Paid"]: transaction.tokenOut || 0,
      ["Transaction Date"]: transaction.transactionDate
        ? moment(transaction.transactionDate).format("DD/MM/YYYY, HH:mm:ss")
        : "-",
    }));

    const pdfBuffer = await generatePDF({
      headers,
      rows,
      title: "Investments Transactions",
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

const sendAirdropConfirmationMail = async (receiversData, transactionHash) => {
  try {
    const mailData = receiversData.map((receiver) => ({
      to: [{ email: receiver.email }],
      dynamic_template_data: {
        user_name: receiver.user_name,
        wallet_address: receiver.wallet_address,
        amount: receiver.amount,
        transaction_hash: receiver.transaction_hash,
      },
    }));
    const response = await sendEmailToMultipleUsers(
      emailTemplateId.airdropUpdate,
      mailData
    );
    console.log("✅ MAIL SENT TO USERS", response);
  } catch (error) {
    console.log("🚀 ~ sendAirdropConfirmationMail ~ error:", error);
  }
};

module.exports = {
  getInvestors,
  getAllInvestments,
  getInvestmentDetails,
  getInvestorById,
  createSale,
  getSales,
  getSale,
  getOneInvestorAllInvestments,
  getSaleStatistics,
  dashboard,
  downloadInvestments,
  updateUserStatus,
  transactions,
  getSalesAirDropTransactions,
  updateSalesAirDropTransactions,
};
