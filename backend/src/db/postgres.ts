import { Pool } from "pg";
import { config } from "../config.js";

export const postgres = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  user: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.database,
  max: config.postgres.max,
  ssl: config.postgres.ssl
    ? { rejectUnauthorized: config.postgres.sslRejectUnauthorized }
    : false,
  application_name: "rally-backend",
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

postgres.on("error", (error) => {
  console.error("Unexpected idle Postgres client error", error);
});

export async function closePostgres(): Promise<void> {
  await postgres.end();
}
