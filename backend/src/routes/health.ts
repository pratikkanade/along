import type { FastifyInstance } from "fastify";
import { queryRows } from "../db/clickhouse.js";
import { postgres } from "../db/postgres.js";

type SchemaCount = { table_count: string };

const REQUIRED_CLICKHOUSE_TABLES = [
  "live_intents",
  "app_events",
  "hex_activity_agg",
  "activity_taxonomy_src",
];

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async (_request, reply) => {
    const [postgresResult, clickHouseResult] = await Promise.allSettled([
      postgres.query("SELECT 1"),
      queryRows<SchemaCount>(
        `SELECT count() AS table_count
         FROM system.tables
         WHERE database = currentDatabase()
           AND name IN ({required_tables:Array(String)})`,
        { required_tables: REQUIRED_CLICKHOUSE_TABLES },
      ),
    ]);
    const clickHouseTableCount =
      clickHouseResult.status === "fulfilled"
        ? Number(clickHouseResult.value[0]?.table_count ?? 0)
        : 0;
    const dependencies = {
      postgres: postgresResult.status === "fulfilled" ? "ok" : "error",
      clickhouse: clickHouseResult.status === "fulfilled" ? "ok" : "error",
      clickhouse_schema:
        clickHouseTableCount === REQUIRED_CLICKHOUSE_TABLES.length ? "ready" : "missing",
    };
    const healthy =
      dependencies.postgres === "ok" &&
      dependencies.clickhouse === "ok" &&
      dependencies.clickhouse_schema === "ready";
    return reply.code(healthy ? 200 : 503).send({
      status: healthy ? "ok" : "degraded",
      dependencies,
      required_clickhouse_tables: REQUIRED_CLICKHOUSE_TABLES,
      timestamp: new Date().toISOString(),
    });
  });
}
