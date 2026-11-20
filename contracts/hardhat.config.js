require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || "";

// Normalize private key (accept with or without 0x prefix)
const accounts = DEPLOYER_PRIVATE_KEY
  ? [DEPLOYER_PRIVATE_KEY.startsWith("0x") ? DEPLOYER_PRIVATE_KEY : `0x${DEPLOYER_PRIVATE_KEY}`]
  : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    // BSC Mainnet
    bsc: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      accounts,
    },
    // BSC Testnet (kept here as a safe option for practice runs)
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545/",
      chainId: 97,
      accounts,
    },
  },
  // Hardhat's verify plugin now uses the unified Etherscan v2 API (one key covers all
  // supported chains, including BSC) — a single string here, not per-network keys.
  etherscan: {
    apiKey: BSCSCAN_API_KEY,
  },
};
