import { buildApp } from "./app.js";
import { config } from "./config.js";
import { closeClickHouse } from "./db/clickhouse.js";
import { closePostgres } from "./db/postgres.js";

const app = await buildApp();

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down");
  await app.close();
  await Promise.allSettled([closePostgres(), closeClickHouse()]);
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

await app.listen({ host: config.host, port: config.port });

