import {
  createPublicClient,
  http,
  getAddress,
  verifyMessage,
  parseUnits,
  decodeEventLog,
} from "viem";
import { bsc } from "viem/chains";
import { config } from "./config.js";

// Public client to read the BSC chain (verify transactions / contract state).
export const publicClient = createPublicClient({
  chain: bsc,
  transport: http(config.bscRpcUrl),
});

// Minimal ABI for the pieces the backend reads.
export const contractAbi = [
  {
    type: "function",
    name: "isRegistered",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getUser",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "registered", type: "bool" },
      { name: "invested", type: "bool" },
      { name: "referrer", type: "address" },
      { name: "directCount", type: "uint256" },
      { name: "teamCount", type: "uint256" },
      { name: "joinedAt", type: "uint256" },
      { name: "investedAt", type: "uint256" },
    ],
  },
];

/**
 * Verify a transaction actually happened on-chain for the given wallet: it exists,
 * succeeded, was sent by the wallet, and was directed at our contract. Used for both
 * register() and buyPlan() confirmations.
 */
export async function verifyContractTx(txHash, walletAddress) {
  if (!config.contractAddress) {
    // No contract configured (e.g. local dev without a deploy) — skip strict check.
    return { ok: true, skipped: true };
  }
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return { ok: false, reason: "tx failed" };

    const tx = await publicClient.getTransaction({ hash: txHash });
    const from = getAddress(tx.from);
    const to = tx.to ? getAddress(tx.to) : null;

    if (from.toLowerCase() !== walletAddress.toLowerCase()) {
      return { ok: false, reason: "tx sender mismatch" };
    }
    if (to && to.toLowerCase() !== getAddress(config.contractAddress).toLowerCase()) {
      return { ok: false, reason: "tx not to contract" };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: err.shortMessage || err.message };
  }
}

// ERC-20 allowance ABI (to confirm the approval really landed on-chain).
const erc20AllowanceAbi = [
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
];

/**
 * Verify a registration approval for the given wallet. This is STRICT so fake wallets
 * or fabricated tx hashes cannot register:
 *   1. The tx must exist, have succeeded, and have been sent BY this wallet.
 *   2. The tx must have been directed at the USDT token contract (an approval call).
 *   3. The on-chain allowance (user -> our contract) must actually be > 0.
 * Only a real signature from the real wallet can satisfy all three.
 */
export async function verifyApprovalTx(txHash, walletAddress) {
  if (!config.contractAddress) {
    return { ok: false, reason: "contract not configured" };
  }
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") return { ok: false, reason: "tx failed" };

    const tx = await publicClient.getTransaction({ hash: txHash });
    const from = getAddress(tx.from);
    const to = tx.to ? getAddress(tx.to) : null;

    if (from.toLowerCase() !== walletAddress.toLowerCase()) {
      return { ok: false, reason: "tx sender mismatch" };
    }
    if (!to || to.toLowerCase() !== getAddress(config.usdtAddress).toLowerCase()) {
      return { ok: false, reason: "tx not an approval to the token" };
    }

    // The decisive check: the allowance must really be set on-chain.
    const allowance = await publicClient.readContract({
      address: getAddress(config.usdtAddress),
      abi: erc20AllowanceAbi,
      functionName: "allowance",
      args: [getAddress(walletAddress), getAddress(config.contractAddress)],
    });
    if (allowance <= 0n) {
      return { ok: false, reason: "no on-chain allowance found" };
    }

    return { ok: true, allowance: allowance.toString() };
  } catch (err) {
    return { ok: false, reason: err.shortMessage || err.message };
  }
}

// ERC-20 Transfer event — used to verify a plan payment landed on-chain.
const erc20TransferEventAbi = [
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "value", type: "uint256", indexed: false },
    ],
  },
];

/**
 * Verify the user PAID for the plan by sending USDT directly to the admin wallet.
 * Retries up to 4 times with a short delay to handle BSC RPC propagation lag — so a
 * tx that was just mined gets a fair chance to appear in the receipt logs before we
 * give up. This prevents the "couldn't confirm" error when the chain is slightly slow.
 */
export async function verifyPlanPayment(txHash, fromAddress) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash || "")) {
    return { ok: false, reason: "invalid txHash" };
  }
  if (!config.adminWallet) {
    return { ok: false, reason: "admin wallet not configured" };
  }

  const MAX_TRIES = 4;
  const DELAY_MS  = 2000; // 2 s between retries

  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    try {
      const result = await _tryVerify(txHash, fromAddress);
      if (result.ok) return result;
      // If the tx itself failed on-chain, no point retrying.
      if (result.reason === "tx failed") return result;
      // Otherwise (log not found yet) wait and retry.
      if (attempt < MAX_TRIES) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      }
    } catch (err) {
      if (attempt < MAX_TRIES) {
        await new Promise((r) => setTimeout(r, DELAY_MS));
      } else {
        return { ok: false, reason: err.shortMessage || err.message };
      }
    }
  }
  return { ok: false, reason: "no matching USDT payment to admin wallet" };
}

async function _tryVerify(txHash, fromAddress) {
  const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") return { ok: false, reason: "tx failed" };

  const usdt = getAddress(config.usdtAddress);
  const admin = getAddress(config.adminWallet);
  const user = getAddress(fromAddress);
  const minUnits = parseUnits(String(config.planPriceUsd), 18);

  let matched = null;
  for (const log of receipt.logs) {
    if (getAddress(log.address).toLowerCase() !== usdt.toLowerCase()) continue;
    let decoded;
    try {
      decoded = decodeEventLog({
        abi: erc20TransferEventAbi,
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue;
    }
    if (decoded.eventName !== "Transfer") continue;
    const { from, to, value } = decoded.args;
    if (
      getAddress(from).toLowerCase() === user.toLowerCase() &&
      getAddress(to).toLowerCase() === admin.toLowerCase() &&
      value >= minUnits
    ) {
      matched = value;
      break;
    }
  }

  if (matched == null) {
    return { ok: false, reason: "no matching USDT payment to admin wallet" };
  }

  return { ok: true, amount: matched.toString(), txHash };
}

/** Read on-chain user data (direct/team counts) as a cross-check. */
export async function readOnChainUser(walletAddress) {
  if (!config.contractAddress) return null;
  try {
    const result = await publicClient.readContract({
      address: getAddress(config.contractAddress),
      abi: contractAbi,
      functionName: "getUser",
      args: [getAddress(walletAddress)],
    });
    return {
      registered: result[0],
      invested: result[1],
      referrer: result[2],
      directCount: Number(result[3]),
      teamCount: Number(result[4]),
      joinedAt: Number(result[5]),
      investedAt: Number(result[6]),
    };
  } catch {
    return null;
  }
}

/**
 * The message a wallet must sign to prove it controls the private key. The nonce
 * makes each challenge unique so a signature can't be trivially replayed.
 */
export function buildAuthMessage(address, nonce) {
  return (
    `Welcome to Decentralized World!\n\n` +
    `Sign this message to verify you own this wallet.\n\n` +
    `Wallet: ${getAddress(address)}\n` +
    `Nonce: ${nonce}`
  );
}

export async function verifyWalletOwnership(address, message, signature) {
  let checksummed;
  try {
    checksummed = getAddress(address);
  } catch {
    return { ok: false, reason: "invalid address" };
  }

  try {
    const valid = await verifyMessage({ address: checksummed, message, signature });
    if (!valid) return { ok: false, reason: "signature does not match wallet" };
  } catch (err) {
    return { ok: false, reason: err.shortMessage || err.message || "signature check failed" };
  }

  return { ok: true };
}
