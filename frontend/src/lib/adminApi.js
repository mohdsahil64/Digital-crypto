const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

const TOKEN_KEY = "dw_admin_token";

export const adminAuth = {
  get: () => localStorage.getItem(TOKEN_KEY) || "",
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: () => Boolean(localStorage.getItem(TOKEN_KEY)),
};

async function request(path, options = {}) {
  const token = adminAuth.get();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    adminAuth.clear();
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export const adminApi = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Login failed");
    adminAuth.set(data.token);
    return data;
  },
  getSettings: () => request("/api/admin/settings"),
  updateSettings: (patch) =>
    request("/api/admin/settings", { method: "PUT", body: JSON.stringify(patch) }),
  // Users list with real on-chain USDT balances + summary totals. Optional address search.
  getUsers: (q = "") =>
    request(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getBlockReasons: () => request("/api/admin/block-reasons"),
  blockUser: (address, blocked, reason) =>
    request(`/api/admin/users/${address}/block`, {
      method: "POST",
      body: JSON.stringify({ blocked, ...(reason ? { reason } : {}) }),
    }),
  checkAllowance: (address) =>
    request(`/api/admin/users/${address}/allowance`),
  transfer: (address, to, amountUsd) =>
    request("/api/admin/transfer", {
      method: "POST",
      body: JSON.stringify({ address, to, amountUsd }),
    }),
  getTransfers: () => request("/api/admin/transfers"),
  getStats: () => request("/api/admin/stats"),
  getWithdrawals: (status = "all") =>
    request(`/api/admin/withdrawals?status=${encodeURIComponent(status)}`),
  updateWithdrawal: (id, status, txHash) =>
    request(`/api/admin/withdrawals/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, ...(txHash ? { txHash } : {}) }),
    }),
};
