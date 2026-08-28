import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { closePostgres, postgres } from "../db/postgres.js";

const seedPath = fileURLToPath(new URL("../../db/postgres/demo_seed.sql", import.meta.url));
const seed = await readFile(seedPath, "utf8");

try {
  await postgres.query("BEGIN");
  await postgres.query(seed);
  await postgres.query("COMMIT");
  console.log("Demo users, profiles, intents, and match seeded successfully");
  console.log("Primary demo user: ddeb301a-f161-4c74-9fab-4fbfd4f54cc8");
} catch (error) {
  await postgres.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await closePostgres();
}

