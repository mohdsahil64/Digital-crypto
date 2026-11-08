import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { usersRouter } from "./routes/users.js";
import { rewardsRouter } from "./routes/rewards.js";
import { teamRouter } from "./routes/team.js";
import { withdrawalsRouter } from "./routes/withdrawals.js";
import { adminRouter } from "./routes/admin.js";

const app = express();

// Behind a proxy (Render/Nginx/etc.) so rate-limit sees the real client IP.
app.set("trust proxy", 1);

// Security headers.
app.use(helmet());

// Only the configured frontend origin may call the API from a browser. Multiple
// origins can be provided comma-separated in FRONTEND_ORIGIN.
const allowedOrigins = config.frontendOrigin
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / server-to-server (no Origin header) and any allowlisted
      // browser origin. Everything else is rejected.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
  })
);

// Reject oversized bodies (defends against payload-abuse).
app.use(express.json({ limit: "16kb" }));

// Global rate limit — smooths out abusive bursts / scripted hammering.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many requests, slow down" },
});
app.use(globalLimiter);

// Tighter limit for sensitive write flows (connect / verify / register / withdraw).
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "too many attempts, please wait a moment" },
});
app.use("/api/users/connect", sensitiveLimiter);
app.use("/api/users/verify-wallet", sensitiveLimiter);
app.use("/api/users/register", sensitiveLimiter);

app.get("/api/health", async (_req, res) => {
  const { getMinWithdrawal, isMaintenanceMode } = await import("./settings.js");
  let minWithdrawal = config.minWithdrawalUsd;
  let maintenanceMode = false;
  try {
    minWithdrawal = await getMinWithdrawal();
    maintenanceMode = await isMaintenanceMode();
  } catch {
    /* fall back to defaults if settings table not ready */
  }
  res.json({
    status: "ok",
    contract: config.contractAddress || null,
    adminWallet: config.adminWallet || null,
    planPriceUsd: config.planPriceUsd,
    minWithdrawalUsd: minWithdrawal,
    // How many USDT 1 internal dollar is worth on withdrawal. Currently 1:1 (payouts
    // send `amountUsd` USDT directly). Exposed so the UI can show a live conversion.
    usdtPerUsd: config.usdtPerUsd,
    maintenanceMode,
  });
});

app.use("/api/users", usersRouter);
app.use("/api/rewards", rewardsRouter);
app.use("/api/team", teamRouter);
app.use("/api/withdrawals", withdrawalsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.listen(config.port, () => {
  console.log(`🚀 Decentralized World API running on http://localhost:${config.port}`);
});
