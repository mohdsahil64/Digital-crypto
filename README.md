# Decentralized World

A wallet-based crypto DApp (college demo project) built on **BSC Mainnet**.

Users connect a crypto wallet, register by paying a **$5 USDT joining fee** to an admin wallet,
and earn level-based daily rewards through a single-leg referral system.

> **Note:** This is a college demonstration project. It is meant to be run locally / on a
> temporary domain to show the full flow (register → invite → dashboard), and then removed.

---

## Tech Stack

| Layer         | Tech                                                        |
| ------------- | ----------------------------------------------------------- |
| Frontend      | Vite + React, Tailwind CSS, Lucide icons, Google Fonts      |
| Wallet / Web3 | wagmi + viem + RainbowKit                                   |
| Backend       | Node.js + Express                                           |
| Database      | PostgreSQL                                                  |
| Contracts     | Solidity (Hardhat), deployed to **BSC Mainnet**             |

## Repository Structure

```
Decentralized-world/
├── contracts/     # Solidity smart contracts (Hardhat) — BSC mainnet
├── backend/       # Node.js + Express API + PostgreSQL
├── frontend/      # Vite + React + Tailwind DApp
└── README.md
```

## The Level / Reward System ("POWER $5")

- One-time entry: **$5 USDT** (BSC)
- Single-leg system
- Maximum **15 direct referrals**
- Minimum withdrawal: **$5**

| Level | Direct | Team      | Daily Reward |
| ----- | ------ | --------- | ------------ |
| L1    | 3      | 10        | $0.25/day    |
| L2    | 5      | 25        | $0.50/day    |
| L3    | 7      | 100       | $1/day       |
| L4    | 9      | 250       | $3/day       |
| L5    | 10     | 500       | $5/day       |
| L6    | 12     | 1,000     | $15/day      |
| L7    | 13     | 2,000     | $25/day      |
| L8    | 15     | 3,500     | $50/day      |
| L9    | 15     | 5,000     | $100/day     |
| L10   | 15     | 10,000    | $250/day     |
| L11   | 15     | 25,000    | $500/day     |
| L12   | 15     | 50,000    | $1,000/day   |
| L13   | 15     | 100,000   | $2,000/day   |
| L14   | 15     | 250,000   | $4,000/day   |
| L15   | 15     | 500,000   | $7,000/day   |
| L16   | 15     | 1,000,000 | $10,000/day  |

## Setup

See each folder's README:
- [`contracts/README.md`](./contracts/README.md) — deploy the contract to BSC mainnet
- [`backend/README.md`](./backend/README.md) — run the API + database
- [`frontend/README.md`](./frontend/README.md) — run the DApp

## Quick Start (high level)

1. Deploy the smart contract to BSC mainnet (see `contracts/`).
2. Start PostgreSQL and run the backend (see `backend/`).
3. Configure frontend `.env` with contract address + backend URL, then run the frontend.

> ⚠️ **Real money warning:** Deploying to BSC mainnet and registering costs **real BNB (gas)
> and real USDT**. Test the whole flow carefully before demoing. Keep private keys only in
> `.env` files that are never committed.
