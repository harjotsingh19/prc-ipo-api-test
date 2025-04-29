const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
const tokenVesting = require("../models/tokenVesting");
const TokenClaimHistory = require("../models/TokenClaimHistory");

const getInvestments = async (req, res) => {
  try {
    let condition = {};

    if (req.data.id && req.data.role === "INVESTOR") {
      condition = { _id: new mongoose.Types.ObjectId(`${req.data.id}`) };
    }

    const investments = await User.aggregate([
      { $match: condition },
      {
        $lookup: {
          from: "transactions",
          let: { userId: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$userId", "$$userId"] } } }],
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
          totalTokenBought: {
            $sum: {
              $toDouble: "$transactions.tokenIn",
            },
          },
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
          "transactions.saleDetails.startDate": 1,
          "transactions.saleDetails.endDate": 1,
          "transactions.saleDetails.tokenPrice": 1,
        },
      },
      // { $skip: skipCount }, // 👈 Pagination: Skip X documents
      // { $limit: pageSize }, // 👈 Pagination: Limit to pageSize
    ]);

    // 4. Optional total count for frontend
    const totalUser = await User.countDocuments(condition);
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

const getTokenContribution = async (req, res) => {
  try {
    const totalTokenOut = await Transaction.aggregate([
      {
        $addFields: {
          tokenOutNumeric: { $toDouble: "$tokenOut" },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$tokenOutNumeric" },
        },
      },
    ]);
    const totalContribution = totalTokenOut[0]?.total || 0;

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.totalContributionFetchSuccess,
      { totalContribution }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

module.exports = {
  getInvestments,
  getTokenContribution,
};
