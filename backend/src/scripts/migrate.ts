import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { postgres, closePostgres } from "../db/postgres.js";

const schemaPath = fileURLToPath(new URL("../../db/postgres/schema.sql", import.meta.url));
const schema = await readFile(schemaPath, "utf8");

try {
  await postgres.query(schema);
  console.log("Postgres schema applied successfully");
} finally {
  await closePostgres();
}

