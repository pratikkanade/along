export const MATCHES_QUERY = `
SELECT
  li.intent_id,
  li.user_id,
  li.activity_key,
  li.family_key,
  li.raw_text,
  li.lat,
  li.lon,
  li.languages,
  li.trust_score,
  li.verified_org,
  geoDistance(li.lon, li.lat, {me_lon:Float64}, {me_lat:Float64}) AS distance_m,
  cosineDistance(li.embedding, {me_vec:Array(Float32)}) AS vector_distance,
  1 - vector_distance AS vector_similarity,
  dictGet('activity_dict', 'parent_path', li.activity_key) AS adjacency_path,
  dateDiff(
    'second',
    greatest(li.window_start, {me_start:DateTime}),
    least(li.window_end, {me_end:DateTime})
  ) AS overlap_seconds,
  exp(-distance_m / 1200) AS distance_score,
  least(greatest(overlap_seconds, 0) / 3600, 1) AS overlap_score,
  li.trust_score / 5 AS trust_component,
  li.family_key = {me_family:String} AS same_family,
  round(
      0.40 * vector_similarity
    + 0.25 * distance_score
    + 0.15 * overlap_score
    + 0.10 * trust_component
    + 0.10 * same_family,
    4
  ) AS score
FROM live_intents AS li
WHERE li.h3_8 IN h3kRing({me_h3_8:UInt64}, 1)
  AND li.intent_id != {me_intent:UUID}
  AND li.user_id != {me_user:UUID}
  AND overlap_seconds > 0
  AND distance_m <= least(li.pref_max_distance_m, {me_max_dist:UInt32})
  AND (empty(li.pref_gender) OR has(li.pref_gender, {me_gender:String}))
  AND (empty({me_pref_gender:Array(String)}) OR has({me_pref_gender:Array(String)}, li.gender))
  AND (empty(li.pref_age_bands) OR has(li.pref_age_bands, {me_age:String}))
  AND (empty({me_pref_ages:Array(String)}) OR has({me_pref_ages:Array(String)}, li.age_band))
  AND notEmpty(arrayIntersect(li.languages, {me_langs:Array(String)}))
ORDER BY score DESC
LIMIT {limit:UInt8}
`;

