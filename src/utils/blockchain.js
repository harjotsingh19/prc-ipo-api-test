const { ethers } = require("ethers");
const { ApiEndPoints } = require("./endpoints");
const config = require("../config/config");
const ABI = [
  "function batchTransfer(uint256[] calldata amounts, address[] calldata receivers) external returns (bool)",
];
const transferFunds = async (amounts, receivers) => {
  try {
    const provider = new ethers.JsonRpcProvider(ApiEndPoints.HttpPrcUrl);
    console.log("🚀 ~ transferFunds ~ provider:", provider);
    const signer = new ethers.Wallet(config.ADMIN_WALLET_ADDRESS, provider);
    console.log("🚀 ~ transferFunds ~ signer:", signer);

    // Connect to contract
    const contract = new ethers.Contract(
      config.PRC_CONTRACT_ADDRESS,
      ABI,
      signer
    );

    const tx = await contract.batchTransfer(amounts, receivers);
    console.log("🚀 ~ transferFunds ~ tx:", tx);

    const receipt = await tx.wait();
    console.log("🚀 ~ transferFunds ~ receipt:", receipt);
    return receipt.hash;
  } catch (error) {
    console.error(error);
    return null;
  }
};

module.exports = { transferFunds };
