const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
const Sale = require("../models/Sale");
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
          transactions: {
            $push: {
              $cond: [
                { $ifNull: ["$transactions._id", false] },
                "$transactions",
                "$$REMOVE",
              ],
            },
          },
          totalTokenBought: {
            $sum: {
              $cond: [
                { $ifNull: ["$transactions.tokenIn", false] },
                { $toDouble: "$transactions.tokenIn" },
                0,
              ],
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
          "transactions.paymentIntentId": 1,
          "transactions.paymentReferenceId": 1,
          "transactions.created_at": 1,
          "transactions.saleDetails._id": 1,
          "transactions.saleDetails.name": 1,
          "transactions.saleDetails.startDate": 1,
          "transactions.saleDetails.endDate": 1,
          "transactions.saleDetails.tokenPrice": 1,
        },
      },
    ]);

    const totalUser = await User.countDocuments(condition);
    console.log("🚀 ~ getInvestments ~ totalCount:", totalUser);

    return httpResponse(
      res,
      statusCode.ok,
      true,
      message.allInvestmentsReturned,
      {
        investments,
      }
    );
  } catch (error) {
    return httpResponse(res, statusCode.errorPage, false, error.message);
  }
};

const getTokenContribution = async (req, res) => {
  try {
    const activeSale = await Sale.findOne({ active: true });
    const totalTokenOut = await Transaction.aggregate([
      {
        $match: {
          saleId: activeSale?._id,
        },
      },
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
