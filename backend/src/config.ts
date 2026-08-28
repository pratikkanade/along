import "dotenv/config";
import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("true")
  .transform((value) => value === "true");

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  PGHOST: z.string().min(1),
  PGPORT: z.coerce.number().int().min(1).max(65_535).default(5432),
  PGUSER: z.string().min(1),
  PGPASSWORD: z.string().min(1),
  PGDATABASE: z.string().min(1),
  PGSSL: booleanFromString,
  PGSSL_REJECT_UNAUTHORIZED: booleanFromString,
  PGPOOL_MAX: z.coerce.number().int().min(1).max(50).default(10),
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USER: z.string().min(1),
  CLICKHOUSE_PASSWORD: z.string().min(1),
  CLICKHOUSE_DATABASE: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1).optional(),
  EMBEDDING_MODEL: z.string().min(1).default("text-embedding-3-small"),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid backend environment: ${z.prettifyError(parsed.error)}`);
}

export const config = {
  host: parsed.data.HOST,
  port: parsed.data.PORT,
  corsOrigins: parsed.data.CORS_ORIGINS.split(",").map((origin) => origin.trim()),
  postgres: {
    host: parsed.data.PGHOST,
    port: parsed.data.PGPORT,
    user: parsed.data.PGUSER,
    password: parsed.data.PGPASSWORD,
    database: parsed.data.PGDATABASE,
    ssl: parsed.data.PGSSL,
    sslRejectUnauthorized: parsed.data.PGSSL_REJECT_UNAUTHORIZED,
    max: parsed.data.PGPOOL_MAX,
  },
  clickhouse: {
    url: parsed.data.CLICKHOUSE_URL,
    username: parsed.data.CLICKHOUSE_USER,
    password: parsed.data.CLICKHOUSE_PASSWORD,
    database: parsed.data.CLICKHOUSE_DATABASE,
  },
  embeddings: {
    apiKey: parsed.data.OPENAI_API_KEY,
    model: parsed.data.EMBEDDING_MODEL,
  },
} as const;
