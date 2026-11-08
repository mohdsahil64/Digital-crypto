import { query } from "./db/pool.js";

/** Get a setting value (string). Returns fallback if missing. */
export async function getSetting(key, fallback = null) {
  const { rows } = await query("SELECT value FROM settings WHERE key = $1", [key]);
  return rows[0] ? rows[0].value : fallback;
}

/** Set a setting value. */
export async function setSetting(key, value) {
  await query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, String(value)]
  );
}

/** Convenience: min withdrawal as a number. */
export async function getMinWithdrawal() {
  const v = await getSetting("min_withdrawal", "5");
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 5;
}

/** Convenience: maintenance mode as a boolean. */
export async function isMaintenanceMode() {
  const v = await getSetting("maintenance_mode", "false");
  return v === "true" || v === "1";
}
