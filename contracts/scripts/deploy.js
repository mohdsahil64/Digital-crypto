const hre = require("hardhat");
require("dotenv").config();

async function main() {
  const usdt = process.env.USDT_ADDRESS;
  const admin = process.env.ADMIN_WALLET;
  const priceHuman = process.env.PLAN_PRICE_USDT || process.env.JOINING_FEE_USDT || "5";

  if (!usdt) throw new Error("USDT_ADDRESS missing in .env");
  if (!admin) throw new Error("ADMIN_WALLET missing in .env");

  // BSC USDT uses 18 decimals.
  const planPrice = hre.ethers.parseUnits(priceHuman, 18);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Admin wallet (receives payments):", admin);
  console.log("USDT address:", usdt);
  console.log("Plan price:", priceHuman, "USDT");

  const Factory = await hre.ethers.getContractFactory("DecentralizedWorld");
  const contract = await Factory.deploy(usdt, admin, planPrice, deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("\n✅ DecentralizedWorld deployed to:", address);
  console.log("\nNext steps:");
  console.log("  1. Put this address in frontend/.env  -> VITE_CONTRACT_ADDRESS");
  console.log("  2. Put this address in backend/.env    -> CONTRACT_ADDRESS");
  console.log(`  3. (optional) Verify: npx hardhat verify --network bsc ${address} "${usdt}" "${admin}" "${planPrice.toString()}" "${deployer.address}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
