import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@localhost:5432/decentralized_world",
  bscRpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/",
  contractAddress: (process.env.CONTRACT_ADDRESS || "").toLowerCase(),
  adminWallet: (process.env.ADMIN_WALLET || "").toLowerCase(),
  usdtAddress: (
    process.env.USDT_ADDRESS || "0x55d398326f99059fF775485246999027B3197955"
  ).toLowerCase(),
  planPriceUsd: parseFloat(
    process.env.PLAN_PRICE_USD || process.env.JOINING_FEE_USD || "5"
  ),
  minWithdrawalUsd: parseFloat(process.env.MIN_WITHDRAWAL_USD || "5"),
  // Conversion used at withdrawal: 1 internal dollar -> this many USDT. Default 1:1.
  usdtPerUsd: parseFloat(process.env.USDT_PER_USD || "1"),
  frontendOrigin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  adminApiKey: process.env.ADMIN_API_KEY || "",
};

// The level table shared with the frontend. Source of truth lives here.
// `directBusiness` = total USDT invested by the user's ACTIVE direct referrals
//   (each active member paid planPriceUsd = $5, so directBusiness = activeDirects × 5).
// `team` = total active members anywhere in the downline (direct + indirect).
export const LEVELS = [
  { level: 1,  directBusiness: 20,   team: 10,      dailyReward: 0.25  },
  { level: 2,  directBusiness: 30,   team: 25,      dailyReward: 0.5   },
  { level: 3,  directBusiness: 50,   team: 100,     dailyReward: 1     },
  { level: 4,  directBusiness: 75,   team: 250,     dailyReward: 3     },
  { level: 5,  directBusiness: 100,  team: 750,     dailyReward: 5     },
  { level: 6,  directBusiness: 150,  team: 2000,    dailyReward: 15    },
  { level: 7,  directBusiness: 200,  team: 5000,    dailyReward: 25    },
  { level: 8,  directBusiness: 250,  team: 15000,   dailyReward: 50    },
  { level: 9,  directBusiness: 300,  team: 25000,   dailyReward: 100   },
  { level: 10, directBusiness: 400,  team: 50000,   dailyReward: 250   },
  { level: 11, directBusiness: 500,  team: 100000,  dailyReward: 500   },
  { level: 12, directBusiness: 600,  team: 200000,  dailyReward: 1000  },
  { level: 13, directBusiness: 700,  team: 300000,  dailyReward: 2000  },
  { level: 14, directBusiness: 800,  team: 500000,  dailyReward: 4000  },
  { level: 15, directBusiness: 900,  team: 750000,  dailyReward: 7000  },
  { level: 16, directBusiness: 1000, team: 1000000, dailyReward: 10000 },
];

/**
 * Given direct business (activeDirects × planPriceUsd) and total active team count,
 * return the highest level the user qualifies for. Returns 0 if they don't qualify yet.
 */
export function computeLevel(directBusiness, teamActive) {
  let achieved = 0;
  for (const l of LEVELS) {
    if (directBusiness >= l.directBusiness && teamActive >= l.team) {
      achieved = l.level;
    }
  }
  return achieved;
}

export function dailyRewardForLevel(level) {
  const found = LEVELS.find((l) => l.level === level);
  return found ? found.dailyReward : 0;
}
