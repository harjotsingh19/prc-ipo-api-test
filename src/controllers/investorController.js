const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
// const tokenVesting = require("../models/tokenVesting");
// const TokenClaimHistory = require("../models/TokenClaimHistory");

// get user's all/single investments

const getInvestments = async (req, res) => {
  try {
    // 1. Extract pagination params
    const pageSize = parseInt(req.query.pageSize) || 10;
    const page = parseInt(req.query.page) || 2;
    const skipCount = (page - 1) * pageSize;

    // 2. Condition for filtering either a specific user or all users
    let condition = {};

    console.log("🚀 ~ getInvestments ~ req.data:", req.data);

    if (req.data.id && req.data.role === "INVESTOR") {
      condition = { _id: new mongoose.Types.ObjectId(`${req.data.id}`) };
    }

    console.log("🚀 ~ getInvestments ~ condition:", condition);

    // 3. Aggregation pipeline
    const investments = await User.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "transactions",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
            // { $sort: { created_at: -1 } },
            { $skip: skipCount }, // Skip transactions for pagination
            { $limit: pageSize }, // Limit to the page size
          ],
          as: "transactions",
        },
      },
      {
        $unwind: {
          path: "$transactions",
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
        $group: {
          _id: "$_id",
          walletAddress: { $first: "$walletAddress" },
          transactions: { $push: "$transactions" },
          totalTokenBought: { $sum: "$transactions.tokenIn" },
        },
      },
      {
        $project: {
          walletAddress: 1,
          totalTokensBought: "$totalTokenBought",
          "transactions._id": 1,
          "transactions.tokenIn": 1,
          "transactions.tokenOut": 1,
          "transactions.saleId": 1,
          "transactions.paymentStatus": 1,
          "transactions.created_at": 1,
          "transactions.saleDetails._id": 1,
          "transactions.saleDetails.name": 1,
          "transactions.saleDetails.startTime": 1,
          "transactions.saleDetails.endTime": 1,
          "transactions.saleDetails.tokenPrice": 1,
        },
      },
      // { $skip: skipCount }, // 👈 Pagination: Skip X documents
      // { $limit: pageSize }, // 👈 Pagination: Limit to pageSize
    ]);

    // 4. Optional total count for frontend
    const totalUser = await User.countDocuments(condition).exec();
    console.log("🚀 ~ getInvestments ~ totalCount:", totalUser);

    // Assuming 'Transaction' is the model for your transactions collection
    // const totalTransactions = await Transaction.countDocuments(condition);
    // console.log("🚀 ~ getTransactions ~ totalTransactions:", totalTransactions);

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestmentsReturned,
      {
        data: investments,
        // pagination: {
        //   total: totalTransactions,
        //   page,
        //   pageSize,
        //   totalPages: Math.ceil(totalTransactions / pageSize),
        // },
      }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getTokenClaimHistory = async (req, res) => {
  try {
    const { page } = req.query;
    const pageSize = parseInt(req.query.pageSize);
    const skip = (page - 1) * pageSize;
    const user = await User.findById(req.data.id).exec();
    const query = {
      investorAddress: { $regex: `^${user.walletAddress}$`, $options: "i" },
    };
    const tokenClaimList = await TokenClaimHistory.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();
    const totalCount = await TokenClaimHistory.countDocuments().exec();
    const responseData = {
      page,
      pageSize,
      totalCount,
      tokenClaimList,
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

module.exports = {
  getInvestments,
  // viewVestingSchedule,
  getTokenClaimHistory,
};
