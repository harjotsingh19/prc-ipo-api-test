const User = require("../models/User");
const Sale = require("../models/Sale");
const Token = require("../models/Token");
const { ethers } = require("ethers");

const { httpResponse } = require("../middleware/responseHandler");
const { isAdmin, addFiltersToWhereClause } = require("../utils/helper");
const { sendEmail, sendEmailToMultipleUsers } = require("../utils/mailManager");

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

function getUserWithTokenPipeline(
  saleId,
  skip,
  pageSize,
  search = {},
  range = {},
  sort = {}
) {
  const matchFilters = {
    walletAddress: { $nin: [null, ""] },
    role: "INVESTOR",
  };

  // Add search filters
  if (search.firstName)
    matchFilters.firstName = { $regex: search.firstName, $options: "i" };
  if (search.lastName)
    matchFilters.lastName = { $regex: search.lastName, $options: "i" };
  if (search.email)
    matchFilters.email = { $regex: search.email, $options: "i" };

  if (range.createdAt?.start || range.createdAt?.end) {
    matchFilters.created_at = {};
    if (range.createdAt.start)
      matchFilters.created_at.$gte = new Date(range.createdAt.start);
    if (range.createdAt.end)
      matchFilters.created_at.$lte = new Date(range.createdAt.end);
  }

  const sortStage = Object.keys(sort).length
    ? {
        $sort: Object.entries(sort).reduce((acc, [key, value]) => {
          acc[key] = value === "asc" ? 1 : -1;
          return acc;
        }, {}),
      }
    : { $sort: { created_at: -1 } };
  return [
    { $match: matchFilters },
    {
      $lookup: {
        from: "transactions",
        let: { userId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$userId", "$$userId"] },
                  { $eq: ["$saleId", saleId] },
                  { $eq: ["$paymentStatus", "Paid"] },
                  { $eq: ["$paymentTokenOutStatus", false] },
                ],
              },
            },
          },
        ],
        as: "userTransactions",
      },
    },
    {
      $match: {
        "userTransactions.0": { $exists: true },
      },
    },
    {
      $addFields: {
        totalTokens: {
          $sum: {
            $map: {
              input: "$userTransactions",
              as: "tx",
              in: { $toDouble: "$$tx.tokenIn" },
            },
          },
        },
      },
    },
    {
      $lookup: {
        from: "sales",
        localField: "userTransactions.saleId",
        foreignField: "_id",
        as: "saleDetails",
      },
    },
    {
      $project: {
        _id: 1,
        walletAddress: 1,
        email: 1,
        firstName: 1,
        lastName: 1,
        totalTokens: 1,
        created_at: 1,
        saleDetails: { $arrayElemAt: ["$saleDetails", 0] },
      },
    },
    sortStage,
    { $skip: skip },
    { $limit: pageSize },
  ];
}

const buildUserAggregationPipelines = (
  saleId,
  skip,
  pageSize,
  search,
  range,
  sort
) => {
  const basePipeline = getUserWithTokenPipeline(
    saleId,
    skip,
    pageSize,
    search,
    range,
    sort
  ).filter((stage) => !["$skip", "$limit"].includes(Object.keys(stage)[0]));

  const countPipeline = [...basePipeline, { $count: "totalCount" }];
  const paginatedPipeline = [
    ...basePipeline,
    { $skip: skip },
    { $limit: pageSize },
  ];

  return { paginatedPipeline, countPipeline };
};

const saleStatus = async (saleId) => {
  const sale = await Sale.findById(saleId);
  return sale ? !(sale.active || new Date() <= new Date(sale.endDate)) : false;
};

//frontend
const getSalesAirDropUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const saleId = new mongoose.Types.ObjectId(`${req.query.id}`);

    const search = req.query.search || {};
    const sort = req.query.sort || {};
    const range = req.query.range || {};

    const saleIsValid = await saleStatus(saleId);
    console.log("🚀 ~ getSalesAirDropUsers ~ saleIsValid:", saleIsValid);
    if (!saleIsValid) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.saleNotFoundOrActive
      );
    }

    const skip = (page - 1) * pageSize;

    const { paginatedPipeline, countPipeline } = buildUserAggregationPipelines(
      saleId,
      skip,
      pageSize,
      search,
      range,
      sort
    );

    const countResult = await User.aggregate(countPipeline);
    console.log("🚀 ~ getSalesAirDropUsers ~ countResult:", countResult);

    const usersWithTokenData = await User.aggregate(paginatedPipeline);

    console.log("🚀 ~ getSalesAirDropUsers= :", usersWithTokenData);

    const responsePayload = {
      page: parseInt(page),
      pageSize,
      totalCount: countResult[0]?.totalCount || 0,
      usersWithTokenData,
    };

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.success,
      responsePayload
    );
  } catch (error) {
    console.error("error:", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const prepareAirdropUserData = async (
  transactedData,
  saleId,
  transactionHash = ""
) => {
  console.log("🚀 ~ transactedData:", transactedData);
  const userIds = [];
  const amounts = [];
  const receivers = [];
  const receiversData = [];
  const validUsers = [];

  for (const item of transactedData) {
    const { _id, walletAddress, totalTokens } = item;

    const userId = new mongoose.Types.ObjectId(`${_id}`);

    if (!userId || !walletAddress || !totalTokens) continue;

    const user = await User.findOne({ _id: userId, walletAddress });
    if (!user) {
      console.warn(
        `User not found for ID: ${userId} and Wallet: ${walletAddress}`
      );
      continue;
    }

    userIds.push(user._id);
    amounts.push(ethers.parseUnits(totalTokens.toString(), 18));
    receivers.push(walletAddress);
    receiversData.push({
      email: user.email,
      user_name: `${user.firstName} ${user.lastName}`,
      wallet_address: walletAddress,
      amount: totalTokens,
    });

    validUsers.push({ user, totalTokens, transactionHash });
  }

  return { userIds, amounts, receivers, receiversData, validUsers };
};

const updateTokenTransferStatus = async (req, res) => {
  try {
    const { transactedData, transactionHash } = req.body;
    let saleId = new mongoose.Types.ObjectId(`${req.params.id}`);
    console.log(
      "🚀 ~ updateTokenTransferStatus ~ transactedData:",
      transactedData
    );

    const saleData = await Sale.findOne({ _id: saleId });
    if (
      !saleData ||
      !Array.isArray(transactedData) ||
      transactedData.length === 0
    ) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.invalidTokenStatusPayload
      );
    }

    const { validUsers } = await prepareAirdropUserData(
      transactedData,
      saleId,
      transactionHash
    );
    console.log("🚀 ~ updateTokenTransferStatus ~ validUsers 222:", validUsers);

    const updatedUsers = [];

    for (const { user, transactionHash, totalTokens } of validUsers) {
      const result = await Transaction.updateMany(
        {
          userId: user._id,
          saleId,
          paymentStatus: "Paid",
          paymentTokenOutStatus: false,
        },
        {
          $set: {
            paymentTokenOutStatus: true,
            paymentHash: transactionHash,
          },
        }
      );

      if (result.modifiedCount > 0) {
        updatedUsers.push({
          email: user.email,
          user_name: `${user.firstName} ${user.lastName}`,
          wallet_address: user.walletAddress,
          amount: totalTokens,
        });
      }
    }

    if (updatedUsers.length > 0) {
      await sendAirdropConfirmationMail(updatedUsers, transactionHash);
      return httpResponse(res, statusCode.ok, true, message.tokenStatusUpdated);
    } else {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.noTokenToAirDropped
      );
    }
  } catch (error) {
    console.error("Error updating token transfer status:", error);
    return httpResponse(res, statusCode.serverError, false, error.message);
  }
};

const getSalesAirDropTransactions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 100;
    const saleId = new mongoose.Types.ObjectId(`${req.params.id}`);

    console.log("🚀 ~ getSalesAirDropTransactions ~ saleId:", saleId);
    const saleValidation = await saleStatus(saleId);
    if (!saleValidation) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.saleNotFoundOrActive
      );
    }

    const transactedData = req.body.transactedData;
    let eligibleUsers;

    if (transactedData.length) {
      const userIds = transactedData.map((u) => u._id);

      const transactions = await Transaction.find({
        userId: { $in: userIds },
        saleId,
        paymentTokenOutStatus: false,
      });

      const matchedUserIds = transactions.map((t) => t.userId.toString());

      eligibleUsers = transactedData.filter((u) =>
        matchedUserIds.includes(u._id.toString())
      );
      console.log(
        "🚀 ~ getSalesAirDropTransactions ~ eligibleUsers:",
        eligibleUsers
      );
    }

    const response =
      Array.isArray(eligibleUsers) && eligibleUsers.length > 0
        ? await handleManualAirdrop(eligibleUsers, saleId)
        : await handleAutomaticAirdrop(saleId, page, pageSize);

    console.log("🚀 ~ getSalesAirDropTransactions ~ transactedData:22");

    return httpResponse(res, statusCode.ok, true, response.message);
  } catch (error) {
    console.error("Error:", error);
    return httpResponse(
      res,
      statusCode.serverError,
      false,
      error.message || "Something went wrong"
    );
  }
};

const processAirdrop = async (transactedData, saleId) => {
  const { userIds, amounts, receivers, receiversData } =
    await prepareAirdropUserData(transactedData, saleId);

  console.log("🚀 ~ processAirdrop ~ userIds:", userIds);
  console.log("🚀 ~ processAirdrop ~ receiversData:", receiversData);
  console.log("🚀 ~ processAirdrop ~ receivers:", receivers);
  console.log("🚀 ~ processAirdrop ~ amounts:", amounts);

  if (amounts.length !== receivers.length) {
    throw new Error(message.amountReceiverLengthMismatch);
  }

  const hash = await transferFunds(amounts, receivers);
  if (!hash) {
    throw new Error(message.ErrorWhileTransferFunds);
  }

  await sendAirdropConfirmationMail(receiversData, hash);

  await Transaction.updateMany(
    {
      userId: { $in: userIds },
      saleId,
      paymentStatus: "Paid",
      paymentTokenOutStatus: false,
    },
    { $set: { paymentTokenOutStatus: true, paymentHash: hash } }
  );

  return { message: message.updateTokenTransferStatusSuccess };
};

const handleManualAirdrop = async (transactedData, saleId) => {
  const result = await processAirdrop(transactedData, saleId);
  if (!result?.message) {
    throw new Error(message.noTransactionUpdated);
  }
  return result;
};

const handleAutomaticAirdrop = async (saleId, page = 1, pageSize = 100) => {
  const skip = (page - 1) * pageSize;
  const { paginatedPipeline } = buildUserAggregationPipelines(
    saleId,
    skip,
    pageSize
  );

  const userData = await User.aggregate(paginatedPipeline);
  console.log("🚀 ~ handleAutomaticAirdrop ~ userData:", userData);

  if (!userData?.length) {
    throw new Error(message.noUserForAirdrop);
  }

  const transactedData = userData.map((user) => ({
    _id: user._id,
    walletAddress: user.walletAddress,
    totalTokens: user.totalTokens,
  }));

  const result = await processAirdrop(transactedData, saleId);
  if (!result?.message) {
    throw new Error("Airdrop processing failed or returned invalid response");
  }

  return result;
};

const getInvestors = async (req, res) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      isBlocked,
      search = "{}",
      sort = "{}",
    } = req.query;

    page = parseInt(page);
    pageSize = parseInt(pageSize);
    const skip = (page - 1) * pageSize;

    // Parse search & sort safely if they come as strings
    if (typeof search === "string") search = JSON.parse(search);
    if (typeof sort === "string") sort = JSON.parse(sort);

    let condition = { role: "INVESTOR", isEmailVerified: true };

    if (isBlocked !== undefined) {
      condition.isBlocked = isBlocked === "true";
    }

    const searchConditions = [];
    for (const [field, value] of Object.entries(search)) {
      if (value?.trim()) {
        searchConditions.push({
          [field]: { $regex: value.trim(), $options: "i" },
        });
      }
    }
    if (searchConditions.length) {
      condition.$or = searchConditions;
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

    const sortStage = {};
    if (Object.keys(sort).length > 0) {
      for (const [field, order] of Object.entries(sort)) {
        sortStage[field] = order === "desc" ? -1 : 1;
      }
    } else {
      sortStage._id = -1; // default
    }

    aggregatePipeline.push({ $sort: sortStage });

    aggregatePipeline.push(
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
          "transactions.paymentReferenceId": 1,
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
          totalCount: {
            $ifNull: [{ $arrayElemAt: ["$metadata.totalCount", 0] }, 0],
          },
        },
      }
    );

    const investors = await User.aggregate(aggregatePipeline).exec();
    const paginatedData = investors[0]?.data || [];
    const totalCount = investors[0]?.totalCount || 0;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestorsReturned,
      {
        page,
        pageSize,
        totalCount,
        investors: paginatedData,
      }
    );
  } catch (error) {
    console.error("getInvestors error:", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getInvestorById = async (req, res) => {
  try {
    const {
      sortBy = "transactionDate",
      sortOrder = "desc",
      page = 1,
      limit = 10,
    } = req.query;

    const investorId = req.params.id;

    console.log("inside getInvestorById");

    if (!investorId) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.investorIdRequired
      );
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const allowedSortFields = ["tokenIn", "tokenOut", "transactionDate"];
    const sortField = allowedSortFields.includes(sortBy)
      ? sortBy
      : "transactionDate";
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const investorAggregation = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${investorId}`),
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

    if (!investorAggregation.length) {
      return httpResponse(
        res,
        statusCode.notFound,
        false,
        message.investorNotFound
      );
    }

    let investorData = investorAggregation[0];

    let transactions = investorData.transactions || [];

    transactions = transactions.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      if (["tokenIn", "tokenOut"].includes(sortField)) {
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

    const totalCount = transactions.length;

    const paginatedTransactions = transactions.slice(skip, skip + limitNum);

    investorData.transactions = paginatedTransactions;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      "Investor returned successfully",
      {
        investor: investorData,
        totalCount,
        page: pageNum,
        pageSize: limitNum,
        totalPages: Math.ceil(totalCount / limitNum),
      }
    );
  } catch (error) {
    console.error("Error inside getInvestorById:", error);
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      saleId,
      search,
      filter,
      sort = {},
      range = {},
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    let sortField = "transactionDate";
    let sortDirection = -1;

    if (sort) {
      const sortKey = Object.keys(sort)[0];
      if (["transactionDate", "tokenIn", "tokenOut"].includes(sortKey)) {
        sortField = sortKey;
        sortDirection = sort[sortKey] === "asc" ? 1 : -1;
      }
    }

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

    const matchConditions = {};

    if (saleId) {
      matchConditions.saleId = new mongoose.Types.ObjectId(`${saleId}`);
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      matchConditions.$or = [
        { "userDetails.firstName": { $regex: searchRegex } },
        { "userDetails.lastName": { $regex: searchRegex } },
        { "userDetails.email": { $regex: searchRegex } },
        { "saleDetails.name": { $regex: searchRegex } },
      ];
    }

    if (range.createdAt && (range.createdAt.start || range.createdAt.end)) {
      matchConditions.transactionDate = {};
      if (range.createdAt.start) {
        matchConditions.transactionDate.$gte = new Date(range.createdAt.start);
      }
      if (range.createdAt.end) {
        matchConditions.transactionDate.$lte = new Date(range.createdAt.end);
      }
    }

    if (Object.keys(matchConditions).length) {
      pipeline.push({ $match: matchConditions });
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

      // 🛠 Fix: Extracted ternary into separate statement
      let sortKeyForMongo;
      if (sortField === "tokenIn") {
        sortKeyForMongo = "numericTokenIn";
      } else if (sortField === "tokenOut") {
        sortKeyForMongo = "numericTokenOut";
      } else {
        sortKeyForMongo = sortField;
      }

      pipeline.push(
        {
          $sort: {
            [sortKeyForMongo]: sortDirection,
          },
        },
        {
          $facet: {
            metadata: [{ $count: "totalCount" }],
            data: [
              { $skip: skip },
              { $limit: limit },
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
      pageSize: limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
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
    console.error("Error in getAllInvestments:", error);
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

    const now = new Date();
    // Validate startDate is in future
    if (new Date(startDate) <= now) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.startDateInPast
      );
    }

    // Validate endDate is after startDate
    if (new Date(endDate) <= new Date(startDate)) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.endDateInPast
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
      isEmailVerified: true,
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
        transaction_hash: transactionHash,
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
  getSalesAirDropUsers,
  updateTokenTransferStatus,
  sendAirdropConfirmationMail,
  getSalesAirDropTransactions,
};
