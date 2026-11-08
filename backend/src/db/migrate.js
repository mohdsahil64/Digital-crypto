import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "./pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
  console.log("Running migration...");
  await pool.query(schema);
  console.log("✅ Migration complete. Tables created (if not existing).");
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
