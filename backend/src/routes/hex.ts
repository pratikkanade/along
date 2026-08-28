import { performance } from "node:perf_hooks";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { queryRows } from "../db/clickhouse.js";
import { dependencyError } from "../errors.js";

const querySchema = z.object({
  metric: z.enum(["posted", "matched", "unmatched"]).default("posted"),
  hours: z.coerce.number().int().min(1).max(72).default(24),
  family_key: z.string().trim().min(1).max(100).optional(),
});

type HexRow = {
  h3: string;
  lat: number;
  lon: number;
  family_key: string;
  posted: string;
  matched: string;
  unmatched: string;
  users: string;
};

export async function hexRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/hex", async (request) => {
    const { metric, hours, family_key: familyKey } = querySchema.parse(request.query);
    const startedAt = performance.now();
    const familyFilter = familyKey ? "AND family_key = {family_key:String}" : "";
    try {
      const rows = await queryRows<HexRow>(
        `SELECT lower(hex(h3_8)) AS h3,
                tupleElement(h3ToGeo(h3_8), 1) AS lat,
                tupleElement(h3ToGeo(h3_8), 2) AS lon,
                family_key,
                sumMerge(posted) AS posted,
                sumMerge(matched) AS matched,
                sumMerge(unmatched) AS unmatched,
                uniqMerge(users) AS users
         FROM hex_activity_agg
         WHERE bucket >= now() - toIntervalHour({hours:UInt16})
           ${familyFilter}
         GROUP BY h3_8, family_key
         HAVING ${metric} > 0
         ORDER BY ${metric} DESC
         LIMIT 1000`,
        familyKey ? { hours, family_key: familyKey } : { hours },
      );
      return {
        data: rows.map((row) => ({
          h3: row.h3,
          lat: Number(row.lat),
          lon: Number(row.lon),
          family_key: row.family_key,
          posted: Number(row.posted),
          matched: Number(row.matched),
          unmatched: Number(row.unmatched),
          users: Number(row.users),
          value: Number(row[metric]),
        })),
        meta: {
          metric,
          hours,
          family_key: familyKey ?? null,
          count: rows.length,
          elapsed_ms: Number((performance.now() - startedAt).toFixed(2)),
        },
      };
    } catch (error) {
      throw dependencyError("clickhouse", error);
    }
  });
}

