# Rally — project context

> Onboarding doc for teammates and AI sessions. Read this before touching code.
> The hour-by-hour execution schedule lives separately in the plan file; this is the durable "what and why."

---

## What we're building

**Rally** — real-time, spontaneous meetup matching. You open the app and say what you want right now — *"anyone want to play pickleball in the Mission in the next hour?"* — and it finds nearby people wanting the same **or an adjacent** thing (pickleball → tennis → badminton).

It covers **needs**, not just activities:
- *"Help me fix a shelf"* — neighborhoods
- *"Does anyone have a spare tampon?"* — campus
- *"Someone to sit with me Thursday"* / *"a ride to my dialysis appointment"* — seniors

**The problem.** Every existing tool requires pre-planning and self-broadcasting. Luma and Eventbrite need a week's notice. A WhatsApp group means announcing yourself to 200 people and hoping someone replies. Nothing serves *"I'm free right now, is anyone else?"*

## Hackathon frame

- **Event:** ClickHouse hackathon, San Francisco. Required stack: Postgres (OLTP) + ClickHouse (OLAP) — "PB&J."
- **Track:** the loneliness epidemic — *"build for the communities trying to hold people together: senior centers, campus groups, neighborhoods."*
- **Judged on:** "Impact in our community/World, improving lives." Useful and impactful — not technically clever.
- **Side prize:** most impressive use of LibreChat ($250).
- **Credits:** $400 ClickHouse Cloud (**requires a fresh email** — existing accounts don't qualify). Langfuse promo `HARNESSHACK2026` (unused — we cut Langfuse).
- **Budget:** 3 hours, 2–3 people.

---

## The thesis

> Most teams will use ClickHouse as a dashboard database. **We use it as the live matching engine.**

One sub-second SQL query does all of this at once:
- H3 `kRing` geo prefilter + exact `geoDistance`
- `cosineDistance` vector similarity over intent embeddings (this is what makes pickleball→tennis work)
- time-window overlap
- **bidirectional** safety filters (a match surfaces only if A accepts B *and* B accepts A)
- trust score

Two things must work or we have no demo:
1. **Post an intent → ranked matches in <1s with human-readable explanations.** Wins the tech track.
2. **The organizer map of *unmatched* demand — the "loneliness gap."** Wins the impact track.

---

## Architecture: two write lanes

The most defensible thing we can say to a judge is *why each lane exists* — not "we used CDC because it was on the slide," but "the hot path can't tolerate replication lag, so it doesn't use it."

```
                        ┌─ INSERT (async_insert) ──→ ClickHouse.live_intents
POST /api/intents ──────┤                                  ↑ matching engine, sub-second
                        └─ INSERT ──→ Managed Postgres ─────┐
                                      (source of truth)     │ ClickPipes CDC
                                                            ↓
                                    ClickHouse.pg_users / pg_profiles / pg_matches / pg_ratings
                                                            ↑ analytics + organizer dashboard
```

- **Hot lane — direct insert.** `live_intents` goes straight to ClickHouse alongside the Postgres write. A "right now" app can't wait seconds for replication.
- **CDC lane — ClickPipes.** Profiles, matches, ratings, historical intents replicate automatically. They drive the dashboard and trust scores, where lag is irrelevant.

**Why CDC is cheap here:** both ends are ClickHouse-managed, so the Managed Postgres sidebar → *"Replicate data in ClickHouse"* **auto-creates the publication and replication slot**. No egress-IP allowlisting, no `wal_level` fiddling, no connection-pooler problem. This is the entire payoff for choosing Managed Postgres over Neon.

---

## Stack

| Layer | Choice | Notes |
|---|---|---|
| OLTP | **ClickHouse Managed Postgres** | Beta. Use the **direct 5432 URI**, never the pooled one. |
| OLAP + matching | **ClickHouse Cloud** | Fresh email for credits. **Disable idling immediately.** |
| Replication | **ClickPipes CDC** | Warm path only |
| App | **Next.js + TypeScript**, `@clickhouse/client` | Deploy to Vercel in hour one |
| Map | **deck.gl `H3HexagonLayer`** + Mapbox | Fallback: circle layer sized by count |
| AI chat | **LibreChat** + hosted ClickHouse MCP (`https://mcp.clickhouse.cloud/mcp`) | Analyst agent only |
| Voice | **browser `webkitSpeechRecognition`**, in-app | Chrome only. Deliberately independent of LibreChat so one failing doesn't kill both beats. |

**Cut, deliberately:** HNSW `vector_similarity` index (brute-force `cosineDistance` over ~1.8k rows is single-digit ms with zero syntax risk, and nobody can see an index) · Langfuse (invisible, extra container) · `retention()` (meaningless over one day of synthetic data) · custom write-MCP (identity-binding is fiddly) · `pg_clickhouse` (P2).

---

## ⚠️ Verified gotchas — each of these costs an hour if you hit it blind

These were researched against live docs. Trust them over memory.

1. **Coordinate order is inconsistent across function families.**
   - `geoToH3(lat, lon, res)` — **latitude first** (changed in v25.5)
   - `geoDistance(lon, lat, lon, lat)` — **longitude first**, returns **metres**
   - A silent swap puts every user in the wrong hemisphere. **Run this before any other SQL:**
     ```sql
     SELECT version();
     SELECT h3ToGeo(geoToH3(37.7599, -122.4148, 8));  -- must be ≈(37.76, -122.41)
     ```

2. **ClickHouse Cloud auto-idles.** The first query after idling times out. Disable idling at setup **and** keep a `SELECT 1` keepalive tab open during the demo. This is the single most likely way the demo fails on stage.

3. **CDC tables need `FINAL`.** ClickPipes lands rows in a `ReplacingMergeTree` with `_peerdb_version` / `_peerdb_is_deleted`. Without `FINAL`, counts silently disagree with Postgres until background merges run. Wrap them the moment the pipe flows:
   ```sql
   CREATE VIEW profiles AS SELECT * FROM pg_profiles FINAL WHERE _peerdb_is_deleted = 0;
   ```

4. **deck.gl wants an H3 hex *string***, e.g. `'8828308281fffff'`, but `geoToH3` returns `UInt64`. Return `lower(hex(h3_8))` from the API.

5. **UInt64 loses precision in JavaScript.** ClickHouse quotes 64-bit ints in JSON by default — leave `output_format_json_quote_64bit_integers = 1` alone, and never `Number()` an H3 index.

6. **Seeding: use distinct `rand64()` seeds per column** (`rand64(1)`, `rand64(2)`) or lat and lon come out correlated and every user lands on a diagonal line.

7. **A `String` dictionary key needs `LAYOUT(COMPLEX_KEY_HASHED())`**, not `HASHED()`.

8. **LibreChat speech config fails silently** if misnested under `speech:`. Smoke-test the mic button in the first hour, not the last.

9. **Vector index** (if we ever add it): `LIMIT` is capped at 100 by `max_limit_for_vector_search_queries`, `ORDER BY` direction must match the metric, and don't set `GRANULARITY`. We cut it — noted for completeness.

10. **Timezone:** seed in UTC, render `America/Los_Angeles`. A "6pm" window displaying "01:00" looks broken on stage.

---

## Data model

`live_intents` **denormalizes the profile snapshot onto each intent** — gender, age band, languages, preferences, trust score. This removes every join from the hot path. It's a deliberate OLAP design call, and worth saying out loud to judges.

Other objects: `app_events` (raw event stream) → `mv_hex_activity` incremental MV → `hex_activity_agg` (`AggregatingMergeTree`, powers the heatmap) · `activity_taxonomy_src` + `activity_dict` DICTIONARY (makes adjacency *explainable*: `pickleball → racquet sports → tennis`).

**Embeddings:** one batch call embeds ~50 taxonomy leaves into `activity_taxonomy_src`; seed intents join their leaf's vector. Free-text intents embed at post time with nearest-leaf fallback. Real `cosineDistance`, no API call in the hot path.

---

## Seed data — the story is engineered, not random

Uniform random data produces a gray mush map and says nothing. **The asymmetry IS the pitch.**

~2,000 users · 8,000 historical intents (14 days) · **1,800 live intents in the last 6 hours** (what the demo queries) · ~30,000 events, across **12 SF anchor clusters** (Gaussian σ ≈ 500–800m, rendered at H3 res 8 ≈ 0.92km across, ~140 populated hexes).

**Deliberate skew:** senior and care intents in **Chinatown, Tenderloin, Bayview, Excelsior** are overwhelmingly **unmatched**. Marina/SoMa/Mission coffee meets are overwhelmingly **matched**. That contrast is the loneliness-gap visual.

**Taxonomy mix** (~50 leaves, 8 families) — 55% fun (racquet, team, endurance, tabletop, food, study) is the *hook*; 25% care/help, 10% campus micro-need, 10% senior/social is the *impact*.

**Languages** drawn realistically for SF: en, es, **zh**, tl, ru, vi. Language matching is a one-line `arrayIntersect` and it lands hard — *"we match Cantonese-speaking seniors in Chinatown with each other."*

Pin one demo user near the venue so the map centers where the judges sit.

---

## Onboarding (designed, not built)

Two principles:
1. **Voice for the story, taps for the safety.** Never let speech-to-text decide a gender-comfort preference.
2. **Under 90 seconds to first value.** Ask 6 things, learn the rest from behavior.

Verify (phone OTP + org/`.edu` badge) → voice intro (~45s, LLM extracts interests/languages/availability) → **tap-only** safety block (age band, gender, "I'm comfortable meeting…", public-place-only, radius + travel mode, accessibility) → **confirm card** with editable chips (*"here's what I heard"* — the trust moment, and the one screen worth mocking) → optional emergency contact → home screen: **"I'm free right now."**

**Reframe voice as access, not gimmick:** *"Voice-first onboarding isn't a demo trick — it's how a 78-year-old in Chinatown who doesn't type uses this at all."*

For the hackathon, profiles are pre-seeded and only the confirm card is mocked. **Say that out loud in the demo.**

---

## Pitch notes

- **Lead the impact beat with the unglamorous categories.** Pickleball is the hook; *"a ride to a dialysis appointment"* and *"someone to sit with me Thursday"* are the impact.
- **Make the map produce a decision, not a metric.** Real neighborhood, real time window, real intervention: *"Chinatown, weekday afternoons, 71% of companionship requests unanswered, most of them in Cantonese — that's where the senior center puts next month's volunteer program."*
- **Answer safety before anyone asks.** Someone *will* ask "so you send strangers into old people's homes?" Have it on screen: org-verified badges, background-check flag for in-home help, bidirectional preference filters as hard `WHERE` clauses, trust score in ranking, public-place default for first meets.
- **State what's real vs simulated, once, explicitly.** *"The 1,800 live intents are synthetic; the query, schema and pipeline are real."* Judges reward the disclosure and punish discovering it themselves.
- **Make CDC visible** — it produces zero pixels otherwise. Keep a `psql` window beside the dashboard, insert a rating, watch it land in ClickHouse.

**Anti-patterns:** opening on an architecture diagram · describing ClickHouse features you never show on screen · ever saying *"we ran out of time to…"*.

---

## Environment status

- ✅ Python 3.12, git, Docker Desktop **installed**
- ❌ **Node is not installed** — needed before anything runs (`winget install OpenJS.NodeJS.LTS`)
- ❌ **Docker daemon not running** — LibreChat needs it
- ⬜ ClickHouse Cloud service — not yet created (fresh email, disable idling)
- ⬜ Managed Postgres — not yet provisioned (beta; trial-credit eligibility unconfirmed)
- ⬜ Repo is empty — greenfield

## Files to create (in order)

```
db/clickhouse/schema.sql      tables, MV, dictionary
db/clickhouse/seed.sql        numbers() generator; SF clusters + engineered skew
scripts/embed_taxonomy.py     one batch embedding call → activity_taxonomy_src
lib/clickhouse.ts             single-owner client (async_insert, UInt64 handling)
app/api/intents/route.ts      dual-write
app/api/matches/route.ts      the money query + elapsed_ms
app/api/hex/route.ts          heatmap data (returns lower(hex(h3_8)))
app/page.tsx                  "I'm free right now" + voice + match cards
app/organizer/page.tsx        H3HexagonLayer, unmatched toggle, live MV counter
```

## Open questions

- Does the $400 trial credit cover Managed Postgres (beta)? Unverified — bail to Neon if provisioning stalls.
- Exact ClickHouse Cloud version — run `SELECT version()` first; several function signatures shifted across 25.x → 26.x.
