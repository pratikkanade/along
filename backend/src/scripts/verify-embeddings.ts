import { embedText } from "../services/embeddings.js";
import { closeClickHouse } from "../db/clickhouse.js";
import { closePostgres } from "../db/postgres.js";

try {
  const embedding = await embedText("play pickleball nearby this evening");
  if (!embedding.length || embedding.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding provider returned an invalid vector");
  }
  console.log(`Embedding provider verified: ${embedding.length} dimensions`);
} finally {
  await Promise.allSettled([closePostgres(), closeClickHouse()]);
}
