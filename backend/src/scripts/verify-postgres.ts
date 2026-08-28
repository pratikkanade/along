import { closePostgres, postgres } from "../db/postgres.js";

const expectedTables = ["orgs", "users", "profiles", "intents", "matches", "ratings"];

try {
  const result = await postgres.query<{ table_name: string }>(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1::text[])
     ORDER BY table_name`,
    [expectedTables],
  );
  const present = result.rows.map((row) => row.table_name);
  const missing = expectedTables.filter((table) => !present.includes(table));
  if (missing.length) throw new Error(`Missing Postgres tables: ${missing.join(", ")}`);
  console.log(`Postgres schema verified: ${present.join(", ")}`);
} finally {
  await closePostgres();
}
