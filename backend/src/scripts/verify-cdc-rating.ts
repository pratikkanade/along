import { closeClickHouse, queryRows } from "../db/clickhouse.js";

const ratingId = "e18cf3d2-dd4f-494d-a4cf-8af0fc6d52e7";
const timeoutAt = Date.now() + 60_000;
let verified = false;

type RatingRow = {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
};

try {
  while (Date.now() < timeoutAt) {
    const rows = await queryRows<RatingRow>(
      `SELECT id, rating, comment, created_at
       FROM ratings_current
       WHERE id = {rating_id:UUID}
       LIMIT 1`,
      { rating_id: ratingId },
    );
    const row = rows[0];
    if (row) {
      console.log(`CDC verified rating ${row.id}: ${row.rating}/5 at ${row.created_at}`);
      verified = true;
      process.exitCode = 0;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }
  if (!verified) {
    throw new Error(`Rating ${ratingId} did not reach ratings_current within 60 seconds`);
  }
} finally {
  await closeClickHouse();
}
