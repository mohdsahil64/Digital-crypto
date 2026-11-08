const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed: ${res.status}`);
    err.status = res.status;
    err.data = data; // carry extra fields (e.g. blocked, blockReason) to the caller
    throw err;
  }
  return data;
}

export const api = {
  connect: (address) =>
    request("/api/users/connect", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),
  getUser: (address) => request(`/api/users/${address}`),
  getApproval: (address) => request(`/api/users/${address}/approval`),
  register: (address, txHash, referralCode) =>
    request("/api/users/register", {
      method: "POST",
      body: JSON.stringify({ address, txHash, referralCode }),
    }),
  // User pays the plan themselves: they send USDT to the admin wallet and submit the
  // resulting txHash. The backend verifies the payment on-chain before activating.
  activatePlan: (address, txHash) =>
    request("/api/users/activate-plan", {
      method: "POST",
      body: JSON.stringify({ address, txHash }),
    }),
  checkUsdtBalance: (address) =>
    request(`/api/users/${address}/usdt-balance`),
  health: () => request("/api/health"),
  getTeam: (address) => request(`/api/team/${address}`),
  getLevels: () => request("/api/rewards/levels"),
  getRewards: (address) => request(`/api/rewards/${address}`),
  accrue: (address) =>
    request(`/api/rewards/${address}/accrue`, { method: "POST" }),
  getWithdrawals: (address) => request(`/api/withdrawals/${address}`),
  requestWithdrawal: (address, amountUsd) =>
    request(`/api/withdrawals/${address}`, {
      method: "POST",
      body: JSON.stringify({ amountUsd }),
    }),
};
