# Codebase Map: Decentralized World

Quick index so any change request can be located fast. Line numbers are approximate (as of this scan).

## Stack

| Part | Tech | Path |
|---|---|---|
| Frontend | React + Vite + Tailwind, wagmi/viem (wallet), react-router | `frontend/src/` |
| Backend | Node + Express, PostgreSQL (`pg`), viem (chain reads) | `backend/src/` |
| Contract | Solidity (Hardhat), BSC | `contracts/contracts/DecentralizedWorld.sol` |
| Deploy | PM2 + nginx | `ecosystem.config.cjs`, `nginx.conf`, `deploy.sh` |

Chain: **BSC only (chainId 56)**. Auth for users is **wallet-based** (no password, no JWT). Admin uses email/password + HMAC token.

---

## 1. Login / Registration flow (step by step)

### Boot (`frontend/src/main.jsx`)
1. `hasFreshSession()` checks `localStorage["dw_session"]` (last activity < 12h, `sessionCache.js`).
2. Not fresh: the cache is cleared and `reconnectOnMount=false`, so the wallet does NOT auto-connect.
3. Fresh: wagmi auto-reconnects the wallet and the session is restored silently.
4. Provider order: `WagmiProvider > QueryClient > BrowserRouter > WalletModalProvider > SessionProvider > App`.

### Step A: Landing (`pages/Hero.jsx`)
- `clearSession()` wipes a stale cache (only if not connected), at ~line 131.
- `captureReferralFromUrl()` saves `?ref=CODE` to `localStorage["dw_referral"]` (`lib/referral.js`).
- The "Join/Connect" button calls `openConnectModal()`.
- `SessionOverlay` (in Hero, ~line 355+) shows the confirm-login / wrong-chain / checking / blocked / error states on the hero itself.
- When `status==="ready"`, Hero navigates to `/dashboard` (registered) or `/register` (new), at ~line 150.

### Step B: Wallet connect (`components/WalletModal.jsx`)
- `WalletPicker.handleConnect(connector)` (~line 75) calls `connectWithFallback` (timeout + retry for injected wallets).
- After connecting, it reads the chainId from the provider and asks to switch to BSC if needed.
- Connectors: EIP-6963 auto-discovered wallets, Coinbase, and WalletConnect (only if `VITE_WALLETCONNECT_PROJECT_ID` is set). See `lib/wagmi.js`.

### Step C: Session state machine (`lib/session.jsx`, the core of login)
Statuses: `idle | checking | confirm-login | wrong-chain | blocked | error | ready`.

Main `useEffect` (~line 158), on wallet connect:
1. Wallet not connected: `reset()` sets status `idle`.
2. Wrong chain: status `wrong-chain`, blocks until the user switches.
3. Cached fresh session for the same address: status `ready` immediately, plus a background `api.connect` re-validate (picks up blocks).
4. Otherwise it calls `POST /api/users/connect`:
   - `registered: true` gives status **`confirm-login`** (the `ConfirmLogin.jsx` screen). "Continue" calls `continueLogin()`, then `authenticate()`, which sets status `ready` and writes the cache. "Use another" calls `useAnotherWallet()`, which disconnects and clears the session.
   - `registered: false` clears the cache, then `authenticate()` sets status `ready` with `user={registered:false}`, and the user gets routed to `/register`.
   - 403 `blocked` gives status `blocked` with `blockReason`.
- Activity (click/keydown/5 min) bumps `verifiedAt`, so an active session doesn't expire.
- `logout()` calls `hardCleanAndDisconnect()`.

### Step D: Route guard (`components/AuthGate.jsx`, wired in `App.jsx` via `Protected`)
- Not connected / idle: redirects to `/`.
- Renders screens for blocked, wrong-chain, confirm-login, checking, and error.
- `ready` + `!user.registered` forces `/register`. `ready` + registered on `/register` redirects to `/dashboard`.
- `App.jsx`: `/register` uses `require="verified"`; every other user page uses `require="registered"`.
- `MaintenanceGate` wraps everything (it reads `GET /api/health` maintenance flag).

### Step E: Registration (`pages/Register.jsx` → `handleActivate()` ~line 31)
1. The referral code is prefilled from the URL or localStorage (editable, optional).
2. It ensures the wallet is on BSC.
3. **Wallet popup:** `USDT.approve(CONTRACT_ADDRESS, APPROVAL_AMOUNT)` (limited 100 USDT allowance, `lib/contract.js`).
4. It waits for the tx receipt.
5. It calls `api.register(address, txHash, referralCode)`, which hits `POST /api/users/register`.
6. It calls `clearReferral()`, then `refresh()`, then navigates to `/dashboard` after 1.5s.
7. Error messages are mapped for rejected tx, insufficient gas, and generic failures.

### Step F: Backend register (`backend/src/routes/users.js`, `POST /register` ~line 137)
1. `blockDuringMaintenance` returns 503 in maintenance mode. A rate limiter is applied in `index.js:61`.
2. It validates the address and the txHash format. It requires `config.contractAddress`.
3. `verifyApprovalTx(txHash, address)` (`chain.js:96`) checks that the receipt succeeded, `tx.from == address`, `tx.to == USDT`, and the on-chain `allowance(address, contract) > 0`.
4. If the user is already registered, it returns `alreadyRegistered`.
5. Anti-replay: the same `register_tx` can't be used by another wallet.
6. It resolves the referrer from `referral_code` (only registered users, never self).
7. It runs an INSERT (new row with `generateReferralCode()`) or an UPDATE (sets registered, `wallet_verified`, `register_tx`).
8. It calls `syncUserStats` + `resyncUplineFrom` (`team.js`) to recount the upline team.
9. It inserts a `transactions` row with type `registration`.
10. It returns `publicUser(user)` (`users.js:407`).

> The DB row is created ONLY at register. `/connect` never writes.

### Step G: After registration
- `/invest` (`pages/Invest.jsx`): the user sends $5 USDT to the admin wallet, then `POST /api/users/activate-plan` runs (`verifyPlanPayment`, `chain.js:151`). That sets `has_invested`, syncs the upline, and accrues rewards.
- `ApprovalGuard` (inside `AppLayout`) polls `GET /api/users/:address/approval`. If the user revoked the allowance, it prompts a re-approve.

### Admin login (separate)
- `pages/admin/AdminLogin.jsx` calls `adminApi.login` (`lib/adminApi.js`, token stored in localStorage), which hits `POST /api/admin/login` (`routes/admin.js:28`).
- `verifyPassword` (scrypt) runs, then `issueToken` (HMAC with `ADMIN_API_KEY`, 1-year TTL).
- The `requireAdmin` middleware checks a Bearer token.
- Admins are created with `backend/src/scripts/createAdmin.js`.

### Unused / legacy auth code
- `auth.js`: `issueNonce` / `verifyNonce` (not called anywhere).
- `chain.js`: `buildAuthMessage`, `verifyWalletOwnership`, `verifyContractTx`, `readOnChainUser` (signature login, not used now).
- `index.js:60`: rate limiter for `/api/users/verify-wallet`, but no such route exists.
- `Hero.jsx` handles a `needs-verify` status that session.jsx never sets.

---

## 2. Backend index

### API routes
| Method & path | File:line | Purpose |
|---|---|---|
| GET `/api/health` | `index.js:63` | health + maintenance flag |
| POST `/api/users/connect` | `routes/users.js:32` | new vs returning lookup, blocked check |
| GET `/api/users/:address` | `users.js:65` | profile |
| GET `/api/users/:address/usdt-balance` | `users.js:85` | on-chain USDT balance |
| GET `/api/users/:address/approval` | `users.js:104` | allowance still active? |
| POST `/api/users/register` | `users.js:137` | register (see flow) |
| POST `/api/users/activate-plan` | `users.js:248` | verify $5 payment, activate |
| GET `/api/users/:address/transactions` | `users.js:326` | unified history |
| PUT `/api/users/:address/settings` | `users.js:363` | username/email/password_hash |
| GET `/api/rewards/levels` | `routes/rewards.js:11` | level table |
| GET `/api/rewards/:address` | `rewards.js:20` | rewards summary/history |
| POST `/api/rewards/:address/accrue` | `rewards.js:106` | accrue today's reward |
| GET `/api/team/:address` | `routes/team.js:11` | downline tree |
| GET/POST `/api/withdrawals/:address` | `routes/withdrawals.js:11/45` | list / request withdrawal |
| POST `/api/admin/login` | `routes/admin.js:28` | admin login |
| GET/PUT `/api/admin/settings` | `admin.js:66/79` | maintenance, min withdrawal |
| GET `/api/admin/users` | `admin.js:111` | user list/search |
| POST `/api/admin/users/:address/block` | `admin.js:198` | block/unblock |
| GET `/api/admin/block-reasons` | `admin.js:226` | reasons list (`BLOCK_REASONS` at line 15) |
| GET `/api/admin/users/:address/allowance` | `admin.js:235` | check allowance |
| POST `/api/admin/transfer` / GET `/transfers` | `admin.js:255/322` | admin pulls USDT via allowance |
| GET `/api/admin/stats` | `admin.js:354` | dashboard stats |
| GET `/api/admin/withdrawals`, PUT `/withdrawals/:id` | `admin.js:383/423` | approve/reject payouts |

### Modules
| File | Key exports |
|---|---|
| `index.js` | Express app, helmet, CORS, rate limiters (global + sensitive), router mounting |
| `config.js` | `config` (env), `LEVELS`, `computeLevel`, `dailyRewardForLevel` |
| `auth.js` | `hashPassword`, `verifyPassword`, `issueToken`, `verifyToken` (+ unused nonce fns) |
| `chain.js` | `publicClient`, `verifyApprovalTx`, `verifyPlanPayment` |
| `adminChain.js` | `readAllowance`, `readUsdtBalance(s)`, `adminChargeTo`, `payoutUsdt` (uses admin private key) |
| `team.js` | `getTeamStats`, `syncUserStats`, `resyncUplineFrom` |
| `rewards.js` | `accrueDailyReward`, `accrueAllDaily` |
| `settings.js` | `getSetting`, `setSetting`, `getMinWithdrawal`, `isMaintenanceMode` |
| `utils.js` | `generateReferralCode`, `normalizeAddress` |
| `db/pool.js`, `db/migrate.js`, `db/schema.sql` | DB connection, migration, schema |
| `scripts/createAdmin.js`, `scripts/dailyAccrual.js` | CLI: create admin, daily reward cron |

### DB tables (`db/schema.sql`)
- `users`: wallet_address, referrer_address, referral_code, registered, register_tx, wallet_verified, has_invested, invest_tx, direct_count, team_count, level, blocked, block_reason, username, email, password_hash, auth_nonce
- `rewards`, `withdrawals`, `admins`, `admin_transfers`, `transactions` (types: registration, plan_purchase, reward, withdrawal, admin_transfer), `settings` (key/value)

---

## 3. Frontend index

### Routes (`App.jsx`)
`/` Hero · `/how-it-works` · `/register` · `/invest` · `/dashboard` · `/refer` · `/team` · `/team/tree` · `/withdraw` · `/history` · `/admin/*` (login, overview, users, transfers, withdrawals, settings) · `/legal/*` (privacy, terms, risk, refund)

### lib/
| File | Role |
|---|---|
| `api.js` | user API client (`API_URL` from `VITE_API_URL`) |
| `adminApi.js` | admin API client + `adminAuth` token storage |
| `session.jsx` | wallet session state machine (`useSession`) |
| `sessionCache.js` | `dw_session` localStorage, 12h freshness |
| `referral.js` | `?ref=` capture, `dw_referral` storage |
| `contract.js` | addresses (env), `erc20Abi`, `dwAbi`, `APPROVAL_AMOUNT`, `JOINING_FEE` |
| `wagmi.js` | wagmi config, connectors, BSC transport |

### components/
| File | Role |
|---|---|
| `AuthGate.jsx` | protected-route guard + status screens |
| `ConfirmLogin.jsx` | returning-user "Continue / Use another" |
| `WalletModal.jsx` | wallet picker, connect, chain switch |
| `MaintenanceGate.jsx` | maintenance screen |
| `ApprovalGuard.jsx` | re-approve prompt if allowance revoked |
| `AppLayout.jsx` | logged-in shell (nav, logout, back) |
| `Navbar`, `Footer`, `Popup`, `Spinner`, `Seo`, `Pagination`, `CopyButton` | UI bits |
| `dashboard/StatCard`, `HistoryList`, `TeamTree` | dashboard widgets |

### pages/
| Page | Main calls |
|---|---|
| `Hero.jsx` | connect button, referral toast, `SessionOverlay` |
| `Register.jsx` | USDT approve, then `api.register` |
| `Invest.jsx` | balance check, USDT transfer to admin, `api.activatePlan` |
| `Dashboard.jsx` | `getUser`, `getRewards`, `accrue` |
| `Refer.jsx` | referral link/code |
| `Team.jsx`, `TeamTree.jsx` | levels, team tree |
| `Withdraw.jsx` | `requestWithdrawal` |
| `History.jsx` | rewards + withdrawals history |
| `admin/*` | admin panel pages (all check `adminAuth.isLoggedIn()`) |

---

## 4. Env vars
- Backend (`backend/.env.example`): `PORT, DATABASE_URL, BSC_RPC_URL, CONTRACT_ADDRESS, ADMIN_WALLET, USDT_ADDRESS, PLAN_PRICE_USD, MIN_WITHDRAWAL_USD, USDT_PER_USD, FRONTEND_ORIGIN, ADMIN_API_KEY` (+ admin private key used by `adminChain.js`)
- Frontend (`frontend/.env.example`): `VITE_API_URL, VITE_CONTRACT_ADDRESS, VITE_USDT_ADDRESS, VITE_ADMIN_WALLET, VITE_JOINING_FEE, VITE_WALLETCONNECT_PROJECT_ID`, transfer destination

## 5. "Where do I change X?" cheatsheet
| Change | File |
|---|---|
| Login screen text / confirm step | `components/ConfirmLogin.jsx`, `pages/Hero.jsx` (SessionOverlay) |
| Login logic / statuses | `lib/session.jsx` |
| Session expiry time | `lib/sessionCache.js` `MAX_SESSION_AGE_MS` |
| Who can open which page | `App.jsx` (`require`), `components/AuthGate.jsx` |
| Wallet list / connect errors | `components/WalletModal.jsx`, `lib/wagmi.js` |
| Register UI / approval amount | `pages/Register.jsx`, `lib/contract.js` |
| Register validation / DB insert | `backend/src/routes/users.js` `/register`, `chain.js` `verifyApprovalTx` |
| Referral rules | `routes/users.js` (~line 177), `lib/referral.js`, `team.js` |
| Plan price / payment check | `config.js` `planPriceUsd`, `chain.js` `verifyPlanPayment`, `pages/Invest.jsx` |
| Levels & daily rewards | `config.js` `LEVELS`, `rewards.js` |
| Withdrawal rules | `routes/withdrawals.js`, `settings.js`, `routes/admin.js` |
| Block user / reasons | `routes/admin.js` (`BLOCK_REASONS`, `/block`) |
| Maintenance mode | `settings.js`, `MaintenanceGate.jsx`, `AdminSettings.jsx` |
| Rate limits / CORS | `backend/src/index.js` |
| DB columns | `backend/src/db/schema.sql`, then run `migrate.js` |
