import { closePostgres, postgres } from "../db/postgres.js";

const ratingId = "e18cf3d2-dd4f-494d-a4cf-8af0fc6d52e7";

try {
  const result = await postgres.query<{ id: string; created_at: Date }>(
    `INSERT INTO ratings (
       id, match_id, rater_user_id, rated_user_id, rating, comment
     ) VALUES ($1, $2, $3, $4, 5, $5)
     ON CONFLICT (id) DO UPDATE SET
       rating = EXCLUDED.rating,
       comment = EXCLUDED.comment,
       created_at = now()
     RETURNING id, created_at`,
    [
      ratingId,
      "0130ac88-2f4b-42eb-9c70-6428ef05134a",
      "ddeb301a-f161-4c74-9fab-4fbfd4f54cc8",
      "2eb5a2fc-0bca-442e-9a66-dd28c69ef786",
      "ClickPipes CDC verification rating",
    ],
  );
  console.log(`CDC test rating written: ${result.rows[0]?.id}`);
} finally {
  await closePostgres();
}

