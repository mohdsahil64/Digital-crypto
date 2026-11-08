// Contract + token addresses and ABIs used by the frontend.

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";
export const USDT_ADDRESS =
  import.meta.env.VITE_USDT_ADDRESS ||
  "0x55d398326f99059fF775485246999027B3197955";
export const JOINING_FEE = import.meta.env.VITE_JOINING_FEE || "5";
// Admin wallet that receives the plan payment (user sends USDT here directly).
export const ADMIN_WALLET = import.meta.env.VITE_ADMIN_WALLET || "";

// Fixed destination for admin "Transfer" (a user's USDT is moved here). Pulled from
// .env (VITE_TRANSFER_DESTINATION); falls back to the admin wallet for now.
export const TRANSFER_DESTINATION =
  import.meta.env.VITE_TRANSFER_DESTINATION || ADMIN_WALLET || "";

// Minimal ERC-20 ABI (transfer + approve + allowance + balanceOf).
export const erc20Abi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

// Unlimited allowance value (max uint256) — user grants once, spends any number of times.
export const MAX_UINT256 =
  115792089237316195423570985008687907853269984665640564039457584007913129639935n;

// DecentralizedWorld ABI (only what the frontend calls/reads).
export const dwAbi = [
  {
    type: "function",
    name: "register",
    stateMutability: "nonpayable",
    inputs: [{ name: "referrer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "buyPlan",
    stateMutability: "nonpayable",
    inputs: [{ name: "referrer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "hasInvested",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "planPrice",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
];
