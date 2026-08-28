import { randomUUID } from "node:crypto";
import { postgres } from "../db/postgres.js";
import { insertRows, queryRows } from "../db/clickhouse.js";
import { ApiError, dependencyError } from "../errors.js";
import { embedText } from "./embeddings.js";

export type CreateIntentInput = {
  intentId?: string;
  userId: string;
  rawText: string;
  activityKey?: string;
  lat: number;
  lon: number;
  windowStart: Date;
  windowEnd: Date;
};

type ProfileSnapshot = {
  user_id: string;
  org_id: string | null;
  gender: string;
  age_band: string;
  languages: string[];
  pref_gender: string[];
  pref_age_bands: string[];
  pref_max_distance_m: number;
  trust_score: string;
  verified_org: boolean;
};

type TaxonomyRow = {
  activity_key: string;
  family_key: string;
  embedding: number[];
  vector_distance?: number;
};

function clickHouseDate(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function resolveTaxonomy(rawText: string, activityKey?: string): Promise<TaxonomyRow> {
  if (activityKey) {
    const rows = await queryRows<TaxonomyRow>(
      `SELECT activity_key, family_key, embedding
       FROM activity_taxonomy_src
       WHERE activity_key = {activity_key:String}
       LIMIT 1`,
      { activity_key: activityKey },
    );
    const row = rows[0];
    if (!row?.embedding.length) {
      throw new ApiError(422, "unknown_activity", `Unknown activity_key: ${activityKey}`);
    }
    return row;
  }

  const embedding = await embedText(rawText);
  const rows = await queryRows<TaxonomyRow>(
    `SELECT activity_key, family_key, embedding,
            cosineDistance(embedding, {intent_embedding:Array(Float32)}) AS vector_distance
     FROM activity_taxonomy_src
     WHERE length(embedding) = length({intent_embedding:Array(Float32)})
     ORDER BY vector_distance ASC
     LIMIT 1`,
    { intent_embedding: embedding },
  );
  const row = rows[0];
  if (!row) {
    throw new ApiError(
      503,
      "taxonomy_unavailable",
      "ClickHouse activity taxonomy has no embedding compatible with the configured model",
    );
  }
  return { ...row, embedding };
}

export async function createIntent(input: CreateIntentInput) {
  const intentId = input.intentId ?? randomUUID();
  const client = await postgres.connect().catch((error: unknown) => {
    throw dependencyError("postgres", error);
  });

  let committed = false;
  try {
    await client.query("BEGIN");
    const profileResult = await client.query<ProfileSnapshot>(
      `SELECT u.id AS user_id, u.org_id, p.gender, p.age_band, p.languages,
              p.pref_gender, p.pref_age_bands, p.pref_max_distance_m,
              p.trust_score::text, p.verified_org
       FROM users u
       JOIN profiles p ON p.user_id = u.id
       WHERE u.id = $1
       FOR SHARE`,
      [input.userId],
    );
    const profile = profileResult.rows[0];
    if (!profile) {
      throw new ApiError(404, "profile_not_found", "A complete Postgres profile is required to post an intent");
    }

    const taxonomy = await resolveTaxonomy(input.rawText, input.activityKey).catch((error: unknown) => {
      if (error instanceof ApiError) throw error;
      throw dependencyError("clickhouse", error);
    });

    await client.query(
      `INSERT INTO intents
        (id, user_id, raw_text, activity_key, family_key, lat, lon, window_start, window_end, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'open')`,
      [
        intentId,
        input.userId,
        input.rawText,
        taxonomy.activity_key,
        taxonomy.family_key,
        input.lat,
        input.lon,
        input.windowStart,
        input.windowEnd,
      ],
    );

    const createdAt = new Date();
    await insertRows(
      "live_intents",
      [
        {
          intent_id: intentId,
          user_id: input.userId,
          activity_key: taxonomy.activity_key,
          family_key: taxonomy.family_key,
          raw_text: input.rawText,
          lat: input.lat,
          lon: input.lon,
          window_start: clickHouseDate(input.windowStart),
          window_end: clickHouseDate(input.windowEnd),
          embedding: taxonomy.embedding,
          gender: profile.gender,
          age_band: profile.age_band,
          languages: profile.languages,
          pref_gender: profile.pref_gender,
          pref_age_bands: profile.pref_age_bands,
          pref_max_distance_m: profile.pref_max_distance_m,
          trust_score: Number(profile.trust_score),
          verified_org: profile.verified_org ? 1 : 0,
          org_id: profile.org_id ?? "",
          created_at: clickHouseDate(createdAt),
        },
      ],
      `intent:${intentId}`,
    ).catch((error: unknown) => {
      throw dependencyError("clickhouse", error);
    });

    await insertRows(
      "app_events",
      [
        {
          ts: clickHouseDate(createdAt),
          event_type: "intent_posted",
          user_id: input.userId,
          intent_id: intentId,
          activity_key: taxonomy.activity_key,
          family_key: taxonomy.family_key,
          lat: input.lat,
          lon: input.lon,
          org_id: profile.org_id ?? "",
        },
      ],
      `intent-posted:${intentId}`,
    ).catch((error: unknown) => {
      throw dependencyError("clickhouse", error);
    });

    await client.query("COMMIT");
    committed = true;
    return {
      intent_id: intentId,
      user_id: input.userId,
      activity_key: taxonomy.activity_key,
      family_key: taxonomy.family_key,
      status: "open" as const,
      created_at: createdAt.toISOString(),
    };
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => undefined);
    if (error instanceof ApiError) throw error;
    if ((error as { code?: string }).code === "23505") {
      throw new ApiError(409, "intent_conflict", "intent_id already exists");
    }
    throw error;
  } finally {
    client.release();
  }
}

