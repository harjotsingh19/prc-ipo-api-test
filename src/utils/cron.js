const cron = require("node-cron");
const { ethers } = require("ethers");
const Sale = require("../models/Sale");
const config = require("../config/config");
const redisClient = require("../db/redis");
const Transaction = require("../models/Transaction");
const { default: mongoose } = require("mongoose");
const Token = require("../models/Token");
// const BlacklistAddress = require('../models/BlacklistAddress');
const PrivateAddress = require("../models/PrivateAddress");
const { userStatusOnBlockchain } = require("../config/constants");
const TokenClaimHistory = require("../models/TokenClaimHistory");
const CRON_INTERVAL = "* * * * *"; // Run every min
const BLOCK_RANGE = 100;

const provider = new ethers.providers.JsonRpcProvider(config.rpcProviderWeb3);

const getAsset = (assetCode) => {
  switch (Number(assetCode)) {
    case 0:
      return "BNB";
    case 1:
      return "USDT";
    case 2:
      return "USDC";
    default:
      return "Unknown";
  }
};

const getLatestBlock = async () => {
  return await provider.getBlockNumber();
};

const getTransaction = async (transactionHash) => {
  return await provider.getTransaction(transactionHash);
};

const getLogs = async (filter) => {
  return await provider.getLogs(filter);
};

const updateRedisBlock = async (key, blockNumber) => {
  await redisClient.set(key, JSON.stringify(Number(blockNumber)));
};

const processTransactionLog = async (log) => {
  const data = ethers.utils.defaultAbiCoder.decode(
    ["uint256", "uint256", "uint256", "uint8"],
    log.data
  );
  const userAddress = ethers.utils.getAddress("0x" + log.topics[1].slice(26));
  const hexToSaleId = ethers.BigNumber.from(log.topics[2]).toString();
  const transaction = await getTransaction(log.transactionHash);
  const saleData = await Sale.findOne({ saleId: hexToSaleId });
  const saleid = saleData ? new mongoose.Types.ObjectId(saleData._id) : null;
  const asset = getAsset(data[3]);

  const isTxnExist = await Transaction.findOne({
    txnHash: log.transactionHash,
  });
  if (!isTxnExist) {
    await Transaction.create({
      txnHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      blockHash: log.blockHash,
      txnIndex: Number(log.transactionIndex),
      gas: Number(transaction.gasLimit),
      gasPrice: Number(transaction.gasPrice),
      from: userAddress,
      to: transaction.to,
      value: Number(transaction.value),
      saleId: saleid,
      tokenAmount: data[0].toString(),
      tokenPrice: data[1].toString(),
      assetAmount: data[2].toString(),
      asset: asset,
    });
  }
};

const processSaleLog = async (log) => {
  const hexToSaleId = ethers.BigNumber.from(log.topics[1]).toString();
  const data = ethers.utils.defaultAbiCoder.decode(
    [
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "uint256",
      "string",
      "uint256",
      "uint256",
      "bool",
    ],
    log.data
  );

  const createSaleData = {
    saleId: hexToSaleId,
    startTime: new Date(Number(data[0]) * 1000),
    endTime: new Date(Number(data[1]) * 1000),
    active: true,
    tokenPrice: Number(data[4]),
    txnHash: log.transactionHash,
    blockNumber: Number(log.blockNumber),
    blockHash: log.blockHash,
    txnIndex: Number(log.transactionIndex),
    saleName: data[5],
    isPrivate: Boolean(data[8]) || true,
    softCap: Number(data[2]),
    hardCap: Number(data[3]),
    minPurchaseAmount: Number(data[6]),
    maxPurchaseAmount: Number(data[7]),
  };

  await Sale.updateMany({ active: true }, { active: false });
  await Sale.findOneAndUpdate(
    { saleId: hexToSaleId, txnHash: log.transactionHash },
    createSaleData,
    { new: true, upsert: true }
  );
};

const processIcoFinalizedLog = async (log) => {
  const finalTokens = ethers.BigNumber.from(log.topics[1]).toString();
  await Token.updateOne(
    { tokenSymbol: "ECT" },
    { finalTokensSold: finalTokens, icoFinalized: true }
  );
  await Sale.updateMany({ active: true }, { active: false });
};

exports.createSaleCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 ~ Create Sale cron ~ 🚀");
      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("sale_last_block")) + 1 ||
        latestBlock - BLOCK_RANGE;
      console.log(
        "Processing Create Sale blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.icoContract,
        topics: [config.saleTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const saleLogs = await getLogs(filter);

      console.log("Received log in Create Sale Cron:", saleLogs.length);

      for (const log of saleLogs) {
        console.log("Processing log:", log);
        await processSaleLog(log);
        await updateRedisBlock("sale_last_block", log.blockNumber);
      }
    } catch (error) {
      console.error("Cron Error in Create Sale", error);
    }
  });
};

const processSaleFinalizeLog = async (log) => {
  const hexToSaleId = ethers.BigNumber.from(log.topics[1]).toString();
  await Sale.updateMany(
    { saleId: hexToSaleId },
    { active: false, isFinalized: true }
  );
};

exports.saleFinalizeCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 ~ Sale Finalize cron ~ 🚀");

      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("sale_finalize_last_block")) + 1 ||
        latestBlock - BLOCK_RANGE;
      console.log(
        "Processing Sale Finalize blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.icoContract,
        topics: [config.saleFinalizeTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const saleFinalizeLogs = await getLogs(filter);

      console.log(
        "Received log in Sale Finalize Cron:",
        saleFinalizeLogs.length
      );
      for (const log of saleFinalizeLogs) {
        console.log("Processing log:", log);
        await processSaleFinalizeLog(log);
        await updateRedisBlock("sale_finalize_last_block", log.blockNumber);
      }
    } catch (error) {
      console.error("Cron Error in Sale Finalize", error);
    }
  });
};

exports.transactionCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 ~ Transaction cron ~ 🚀");

      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("transaction_last_block")) + 1 ||
        latestBlock - BLOCK_RANGE;
      console.log(
        "Processing Transaction blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.icoContract,
        topics: [config.transactionTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const transactionLogs = await getLogs(filter);

      console.log("Received log in Transaction Cron:", transactionLogs.length);
      for (const log of transactionLogs) {
        console.log("Processing log:", log);
        await processTransactionLog(log);
        await updateRedisBlock("transaction_last_block", log.blockNumber);
      }
    } catch (error) {
      console.error("Cron Error in Transaction", error);
    }
  });
};

exports.icoFinalizedCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 ~ ICO Finalized cron ~ 🚀");
      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("icofinalized_last_block")) + 1 ||
        latestBlock - BLOCK_RANGE;
      console.log(
        "Processing ICO Finalized blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.icoContract,
        topics: [config.icoFinalizedTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const icoFinalizedLogs = await getLogs(filter);

      console.log(
        "Received log in ICO Finalized Cron:",
        icoFinalizedLogs.length
      );

      for (const log of icoFinalizedLogs) {
        console.log("Processing log:", log);
        await processIcoFinalizedLog(log);
        await updateRedisBlock("icofinalized_last_block", log.blockNumber);
      }
    } catch (error) {
      console.error("Cron Error in ICO Finalized", error);
    }
  });
};

const handleNormalizedUser = async (userAddress) => {
  try {
    await PrivateAddress.deleteOne({
      walletAddress: { $regex: `^${userAddress}$`, $options: "i" },
    });
    await BlacklistAddress.deleteOne({
      walletAddress: { $regex: `^${userAddress}$`, $options: "i" },
    });
  } catch (error) {
    console.error("Error in handle Normalized User", error);
  }
};

const handleWhitelist = async (userAddress) => {
  try {
    await PrivateAddress.updateOne(
      { walletAddress: { $regex: `^${userAddress}$`, $options: "i" } },
      {
        walletAddress: userAddress,
      },
      { upsert: true }
    );
    await BlacklistAddress.deleteOne({
      walletAddress: { $regex: `^${userAddress}$`, $options: "i" },
    });
  } catch (error) {
    console.error("Error in handle Whitelist User", error);
  }
};

const handleBlacklist = async (userAddress) => {
  try {
    await BlacklistAddress.updateOne(
      { walletAddress: { $regex: `^${userAddress}$`, $options: "i" } },
      {
        walletAddress: userAddress,
      },
      { upsert: true }
    );
    await PrivateAddress.deleteOne({
      walletAddress: { $regex: `^${userAddress}$`, $options: "i" },
    });
  } catch (error) {
    console.error("Error in handle Blacklist User", error);
  }
};

const processUserStatusUpdateLog = async (log) => {
  const userAddress = ethers.utils.getAddress("0x" + log.topics[1].slice(26));
  const data = ethers.utils.defaultAbiCoder.decode(["uint256"], log.data);
  switch (Number(data[0])) {
    case userStatusOnBlockchain.Normalized:
      await handleNormalizedUser(userAddress);
      break;
    case userStatusOnBlockchain.whitelisted:
      await handleWhitelist(userAddress);
      break;
    case userStatusOnBlockchain.blacklisted:
      await handleBlacklist(userAddress);
      break;
    default:
      break;
  }
};

exports.userStatusUpdateCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 ~ User Status Update cron ~ 🚀");
      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("user_status_update_last_block")) +
          1 || latestBlock - BLOCK_RANGE;
      console.log(
        "Processing User Status Update blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.icoContract,
        topics: [config.userStatusUpdateTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const userStatusUpdateLogs = await getLogs(filter);
      console.log(
        "Received log in User Status Update Cron:",
        userStatusUpdateLogs.length
      );

      for (const log of userStatusUpdateLogs) {
        console.log("Processing User Status Update log:", log);
        await processUserStatusUpdateLog(log);
        await updateRedisBlock(
          "user_status_update_last_block",
          log.blockNumber
        );
      }
    } catch (error) {
      console.error("Cron Error in User Status Update", error);
    }
  });
};

const processClaimTokenLog = async (log) => {
  const userAddress = ethers.utils.getAddress("0x" + log.topics[1].slice(26));
  const data = ethers.utils.defaultAbiCoder.decode(["uint256"], log.data);
  if (data.length) {
    const transaction = await getTransaction(log.transactionHash);
    const claimTokenData = {
      txnHash: log.transactionHash,
      blockNumber: Number(log.blockNumber),
      blockHash: log.blockHash,
      txnIndex: Number(log.transactionIndex),
      gas: Number(transaction.gasLimit),
      gasPrice: Number(transaction.gasPrice),
      investorAddress: userAddress,
      tokenAmount: data[0].toString(),
    };
    await TokenClaimHistory.updateOne(
      { txnHash: log.transactionHash },
      claimTokenData,
      { upsert: true }
    );
  }
};

exports.claimTokenCron = async () => {
  cron.schedule(CRON_INTERVAL, async () => {
    try {
      console.log("🚀 claim Token cron  🚀");
      const latestBlock = await getLatestBlock();
      const fromBlock =
        JSON.parse(await redisClient.get("claim_token_last_block")) + 1 ||
        latestBlock - BLOCK_RANGE;
      console.log(
        "Processing claim Token blocks from",
        fromBlock,
        "to",
        latestBlock
      );

      const filter = {
        address: config.vestingContractAddress,
        topics: [config.claimTokenTopic],
        fromBlock,
        toBlock: latestBlock,
      };
      const claimTokenLogs = await getLogs(filter);
      console.log("Received log in claim Token Cron:", claimTokenLogs.length);

      for (const log of claimTokenLogs) {
        console.log("Processing claim Token log:", log);
        await processClaimTokenLog(log);
        await updateRedisBlock("claim_token_last_block", log.blockNumber);
      }
    } catch (error) {
      console.error("Cron Error in claim Token", error);
    }
  });
};
