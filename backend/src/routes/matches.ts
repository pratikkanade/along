import { performance } from "node:perf_hooks";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { queryRows } from "../db/clickhouse.js";
import { ApiError, dependencyError } from "../errors.js";
import { MATCHES_QUERY } from "../queries/matches.js";

const querySchema = z.object({
  intent_id: z.uuid(),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

type MeRow = {
  intent_id: string;
  user_id: string;
  h3_8: string;
  lat: number;
  lon: number;
  window_start: string;
  window_end: string;
  embedding: number[];
  gender: string;
  age_band: string;
  languages: string[];
  pref_gender: string[];
  pref_age_bands: string[];
  pref_max_distance_m: number;
  family_key: string;
};

type MatchRow = {
  intent_id: string;
  user_id: string;
  activity_key: string;
  family_key: string;
  raw_text: string;
  lat: number;
  lon: number;
  languages: string[];
  trust_score: number;
  verified_org: number;
  distance_m: number;
  vector_distance: number;
  vector_similarity: number;
  adjacency_path: string;
  overlap_seconds: number;
  distance_score: number;
  overlap_score: number;
  trust_component: number;
  same_family: number;
  score: number;
};

export async function matchRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/matches", async (request) => {
    const { intent_id: intentId, limit } = querySchema.parse(request.query);
    const startedAt = performance.now();
    try {
      const meRows = await queryRows<MeRow>(
        `SELECT intent_id, user_id, h3_8, lat, lon, window_start, window_end,
                embedding, gender, age_band, languages, pref_gender, pref_age_bands,
                pref_max_distance_m, family_key
         FROM live_intents
         WHERE intent_id = {intent_id:UUID}
         ORDER BY created_at DESC
         LIMIT 1`,
        { intent_id: intentId },
      );
      const me = meRows[0];
      if (!me) throw new ApiError(404, "intent_not_found", "Intent is not present in ClickHouse live_intents");
      if (!me.embedding.length) {
        throw new ApiError(422, "intent_embedding_missing", "Intent cannot be matched without a real embedding");
      }

      const rows = await queryRows<MatchRow>(MATCHES_QUERY, {
        me_lon: me.lon,
        me_lat: me.lat,
        me_vec: me.embedding,
        me_start: me.window_start,
        me_end: me.window_end,
        me_h3_8: me.h3_8,
        me_intent: me.intent_id,
        me_user: me.user_id,
        me_max_dist: me.pref_max_distance_m,
        me_gender: me.gender,
        me_pref_gender: me.pref_gender,
        me_age: me.age_band,
        me_pref_ages: me.pref_age_bands,
        me_langs: me.languages,
        me_family: me.family_key,
        limit,
      });

      return {
        data: rows.map((row) => ({
          intent_id: row.intent_id,
          user_id: row.user_id,
          activity_key: row.activity_key,
          family_key: row.family_key,
          raw_text: row.raw_text,
          location: { lat: row.lat, lon: row.lon },
          languages: row.languages,
          verified_org: Boolean(row.verified_org),
          score: row.score,
          explanation: {
            distance_m: Math.round(row.distance_m),
            overlap_minutes: Math.floor(row.overlap_seconds / 60),
            adjacency_path: row.adjacency_path,
            trust_score: row.trust_score,
          },
          score_breakdown: {
            vector_similarity: row.vector_similarity,
            distance: row.distance_score,
            time_overlap: row.overlap_score,
            trust: row.trust_component,
            same_family: Boolean(row.same_family),
          },
        })),
        meta: {
          source_intent_id: intentId,
          count: rows.length,
          elapsed_ms: Number((performance.now() - startedAt).toFixed(2)),
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw dependencyError("clickhouse", error);
    }
  });
}

