const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");

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
          "transactions.saleDetails.startTime": 1,
          "transactions.saleDetails.endTime": 1,
          "transactions.saleDetails.tokenPrice": 1,
        },
      },
    ]);

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

const getKycStatus = async (req, res) => {
  try {
    let condition;
    if (req.data.id) {
      condition = { _id: new mongoose.Types.ObjectId(req.data.id) };
    }
    const kycStatus = await User.aggregate([
      {
        $match: condition,
      },
      {
        $lookup: {
          from: "kycs",
          localField: "_id",
          foreignField: "userId",
          as: "kycHistory",
        },
      },
      {
        $project: {
          status: 1,
          isKycVerified: 1,
          statusHistory: 1,
          "kycHistory.moderationComment": 1,
          "kycHistory.rejectionReason": 1,
          "kycHistory.rejectionType": 1,
          "kycHistory.reviewAnswer": 1,
          "kycHistory.reviewStatus": 1,
          "kycHistory.buttonIds": 1,
          "kycHistory.rejectLabels": 1,
          "kycHistory.isLatest": 1,
        },
      },
    ]);
    if (kycStatus.length) {
      return httpResponse(
        res,
        statusCode.ok,
        true,
        message.investorKycStatusReturned,
        kycStatus[0]
      );
    }

    return httpResponse(res, statusCode.ok, false, message.noRecordFound, {});
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
  getTokenClaimHistory,
  getTokenContribution,
};
