import { createClient, type DataFormat } from "@clickhouse/client";
import { config } from "../config.js";

export const clickhouse = createClient({
  url: config.clickhouse.url,
  username: config.clickhouse.username,
  password: config.clickhouse.password,
  database: config.clickhouse.database,
  application: "rally-backend",
  request_timeout: 15_000,
  clickhouse_settings: {
    output_format_json_quote_64bit_integers: 1,
  },
});

export async function queryRows<T>(query: string, queryParams?: Record<string, unknown>): Promise<T[]> {
  const result = await clickhouse.query(
    queryParams
      ? { query, format: "JSONEachRow", query_params: queryParams }
      : { query, format: "JSONEachRow" },
  );
  return result.json<T>();
}

export async function insertRows<T extends Record<string, unknown>>(
  table: string,
  values: T[],
  deduplicationToken: string,
  format: DataFormat = "JSONEachRow",
): Promise<void> {
  await clickhouse.insert({
    table,
    values,
    format,
    clickhouse_settings: {
      async_insert: 0,
      wait_for_async_insert: 1,
      insert_deduplication_token: deduplicationToken,
    },
  });
}

export async function closeClickHouse(): Promise<void> {
  await clickhouse.close();
}
