const { default: mongoose } = require("mongoose");
const User = require("../models/User");
const { httpResponse } = require("../middleware/responseHandler");
const { statusCode, message } = require("../config/constants");
const Transaction = require("../models/Transaction");
const tokenVesting = require("../models/tokenVesting");
const TokenClaimHistory = require("../models/TokenClaimHistory");

// get user's all/single investments

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

// const getInvestments = async (req, res) => {
//   try {
//     let condition = {};
//     if (req.data.id && req.data.role === "INVESTOR") {
//       condition = { _id: new mongoose.Types.ObjectId(req.data.id) };
//     }

//     const investments = await User.aggregate([
//       {
//         $match: condition,
//       },
//       {
//         $addFields: {
//           walletAddress: { $toLower: "$walletAddress" },
//         },
//       },
//       {
//         $lookup: {
//           from: "transactions",
//           let: { walletAddress: "$walletAddress" },
//           pipeline: [
//             {
//               $match: {
//                 $expr: {
//                   $eq: [{ $toLower: "$from" }, "$$walletAddress"],
//                 },
//               },
//             },
//             {
//               $sort: { created_at: -1 }, //from transactions
//             },
//           ],
//           as: "transactions",
//         },
//       },
//       {
//         $unwind: {
//           path: "$transactions",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $lookup: {
//           from: "sales",
//           localField: "transactions.saleId",
//           foreignField: "_id",
//           as: "transactions.saleDetails",
//         },
//       },
//       {
//         $unwind: {
//           path: "$transactions.saleDetails",
//           preserveNullAndEmptyArrays: true,
//         },
//       },
//       {
//         $group: {
//           _id: "$_id",
//           walletAddress: { $first: "$walletAddress" },
//           transactions: { $push: "$transactions" },
//           totalTokenBought: { $sum: "$transactions.value" },
//         },
//       },
//       {
//         $addFields: {
//           totalTokensBought: {
//             $sum: "$transactions.tokenAmount",
//           },
//           transactions: {
//             $map: {
//               input: "$transactions",
//               as: "txn",
//               in: {
//                 _id: "$$txn._id",
//                 txnHash: "$$txn.txnHash",
//                 value: "$$txn.value",
//                 tokenAmount: "$$txn.tokenAmount",
//                 tokenPrice: "$$txn.tokenPrice",
//                 saleId: "$$txn.saleId",
//                 created_at: "$$txn.created_at",
//                 saleDetails: "$$txn.saleDetails",
//                 asset: "$$txn.asset",
//                 assetAmount: "$$txn.assetAmount",
//               },
//             },
//           },
//         },
//       },
//       {
//         $project: {
//           walletAddress: 1,
//           totalTokensBought: 1,
//           "transactions._id": 1,
//           "transactions.txnHash": 1,
//           "transactions.value": 1,
//           "transactions.tokenAmount": 1,
//           "transactions.tokenPrice": 1,
//           "transactions.saleId": 1,
//           "transactions.created_at": 1,
//           "transactions.saleDetails": 1,
//           "transactions.asset": 1,
//           "transactions.assetAmount": 1,
//         },
//       },
//     ]);

//     if (
//       investments.length &&
//       investments[0].transactions.length &&
//       !investments[0].transactions[0].txnHash
//     ) {
//       investments[0].transactions = [];
//     }

//     return httpResponse(
//       res,
//       statusCode.ok,
//       true,
//       message.allInvestmentsReturned,
//       investments
//     );
//   } catch (error) {
//     return httpResponse(res, statusCode.errorPage, false, error.message);
//   }
// };

const getInvestments2 = async (req, res) => {
  try {
    let condition = {};
    if (req.data.id && req.data.role === "INVESTOR") {
      condition = { _id: new mongoose.Types.ObjectId(req.data.id) };
    }

    const investments = await User.aggregate([
      {
        $match: condition,
      },
      {
        $addFields: {
          walletAddress: { $toLower: "$walletAddress" },
        },
      },
      {
        $lookup: {
          from: "transactions",
          let: { walletAddress: "$walletAddress" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: [{ $toLower: "$from" }, "$$walletAddress"],
                  /**
                                     * Field	Collection
                                        from	transactions
                                        walletAddress	users
                                        created_at	transactions
                                     */
                },
              },
            },
            {
              $sort: { created_at: -1 }, //transactions
            },
          ],
          as: "transactions",
        },
      },

      /**
       *    {
                _id: "u1",
                transactions: [
                    { value: 100, saleId: "s1" },
                    { value: 200, saleId: "s2" }
                ]
            }
       */
      {
        $unwind: {
          path: "$transactions",
          preserveNullAndEmptyArrays: true,

          /**
           *  If Alice had 2 transactions, this creates 2 documents:

            { _id: u1, ..., transactions: t1 }
            { _id: u1, ..., transactions: t2 }


            { _id: "u1", transactions: { value: 100, saleId: "s1" } }
            { _id: "u1", transactions: { value: 200, saleId: "s2" } }
           */
        },
      },
      {
        $lookup: {
          from: "sales",
          localField: "transactions.saleId",
          foreignField: "_id",
          as: "transactions.saleDetails",

          /**
           * 
           *    Field	                     Collection
                transactions.saleId	        transactions
                _id (sale)	                sales
           */
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
          totalTokenBought: { $sum: "$transactions.value" },
        },
      },
      {
        $addFields: {
          totalTokensBought: {
            $sum: "$transactions.tokenAmount",
          },
          transactions: {
            $map: {
              input: "$transactions",
              as: "txn",
              in: {
                _id: "$$txn._id",
                txnHash: "$$txn.txnHash",
                value: "$$txn.value",
                tokenAmount: "$$txn.tokenAmount",
                tokenPrice: "$$txn.tokenPrice",
                saleId: "$$txn.saleId",
                created_at: "$$txn.created_at",
                saleDetails: "$$txn.saleDetails",
                asset: "$$txn.asset",
                assetAmount: "$$txn.assetAmount",
              },
            },
          },
        },
      },
      {
        $project: {
          walletAddress: 1,
          totalTokensBought: 1,
          "transactions._id": 1,
          "transactions.txnHash": 1,
          "transactions.value": 1,
          "transactions.tokenAmount": 1,
          "transactions.tokenPrice": 1,
          "transactions.saleId": 1,
          "transactions.created_at": 1,
          "transactions.saleDetails": 1,
          "transactions.asset": 1,
          "transactions.assetAmount": 1,
        },
      },
    ]);

    if (
      investments.length &&
      investments[0].transactions.length &&
      !investments[0].transactions[0].txnHash
    ) {
      investments[0].transactions = [];
    }

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

// Get investor's KYC status
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

const viewVestingSchedule = async (req, res) => {
  try {
    const id = req.params;
    const user = await User.findById(req.data.id);
    const transaction = await Transaction.findOne({
      _id: new mongoose.Types.ObjectId(id),
      from: { $regex: `^${user.walletAddress}$`, $options: "i" },
    });
    if (!transaction) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.transactionNotFound
      );
    }
    const vestingData = await tokenVesting.findOne({
      txnId: transaction._id,
      txnHash: transaction.txnHash,
    });
    if (!vestingData) {
      return httpResponse(
        res,
        statusCode.badRequest,
        false,
        message.vestingDataNotFound
      );
    }
    return httpResponse(res, statusCode.ok, true, message.dataFetchSuccess, {
      transaction,
      vestingData,
    });
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
  getKycStatus,
  viewVestingSchedule,
  getTokenClaimHistory,
  getTokenContribution,
};
