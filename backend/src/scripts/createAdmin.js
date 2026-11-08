/**
 * Create (or update) an admin account for the /admin panel.
 *
 * Usage:
 *   node src/scripts/createAdmin.js <email> <password>
 */
import { pool, query } from "../db/pool.js";
import { hashPassword } from "../auth.js";

async function main() {
  const email = (process.argv[2] || "").trim().toLowerCase();
  const password = process.argv[3] || "";
  if (!email || !password) {
    console.error("Usage: node src/scripts/createAdmin.js <email> <password>");
    process.exit(1);
  }

  const hash = hashPassword(password);
  await query(
    `INSERT INTO admins (email, password_hash) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
    [email, hash]
  );
  console.log(`✅ Admin ready: ${email}`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
