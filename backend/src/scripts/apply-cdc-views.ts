import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { clickhouse, closeClickHouse } from "../db/clickhouse.js";

const viewsPath = fileURLToPath(new URL("../../db/clickhouse/cdc_views.sql", import.meta.url));
const sql = await readFile(viewsPath, "utf8");
const statements = sql
  .split(";")
  .map((statement) => statement.trim())
  .filter(Boolean);

try {
  for (const statement of statements) {
    await clickhouse.command({ query: statement });
  }
  console.log(`Applied ${statements.length} ClickHouse CDC views`);
} finally {
  await closeClickHouse();
}

