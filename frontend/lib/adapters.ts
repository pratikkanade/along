// Adapts backend API shapes into the Match / HexCluster view types the
// existing components render. Keeps all "backend->UI" translation in one place.

import type { BackendHexCell, BackendMatch } from "./api";
import { avatarColor, languageLabel, prettifyActivity, pseudoName } from "./config";
import type { HexCluster, Match } from "./types";

export function toMatch(m: BackendMatch, myActivityKey: string, myLanguages: string[]): Match {
  const differentActivity = m.activity_key !== myActivityKey;
  const adjacencyPath =
    m.score_breakdown.same_family && differentActivity
      ? [prettifyActivity(myActivityKey), m.explanation.adjacency_path, prettifyActivity(m.activity_key)].filter(
          (s) => s && s.length > 0,
        )
      : undefined;

  // Prefer a shared non-English language for the pitch ("speaks Spanish/Cantonese").
  const shared = m.languages.filter((l) => myLanguages.includes(l));
  const sharedNonEnglish = shared.find((l) => l !== "en");
  const sharedLanguage = sharedNonEnglish ? languageLabel(sharedNonEnglish) : undefined;

  return {
    id: m.intent_id,
    displayName: pseudoName(m.user_id),
    avatarColor: avatarColor(m.user_id),
    activityLabel: prettifyActivity(m.activity_key),
    requestedActivity: m.activity_key,
    adjacencyPath,
    rawText: m.raw_text,
    distanceM: m.explanation.distance_m,
    overlapMinutes: m.explanation.overlap_minutes,
    sharedLanguage,
    trustScore: Number(m.explanation.trust_score),
    score: m.score,
    isSenior: m.family_key === "senior_social",
    verifiedOrg: m.verified_org ? "verified community member" : undefined,
  };
}

// Known San Francisco cluster centers, used only to attach a human-readable name
// and (for gap neighborhoods) a narration note to real ClickHouse hex cells.
type Neighborhood = { name: string; lat: number; lon: number; gapNote?: string };

const NEIGHBORHOODS: Neighborhood[] = [
  { name: "Mission", lat: 37.7599, lon: -122.4148 },
  { name: "SoMa", lat: 37.7785, lon: -122.4056 },
  { name: "Marina", lat: 37.8021, lon: -122.4382 },
  { name: "Hayes Valley", lat: 37.7765, lon: -122.4241 },
  { name: "North Beach", lat: 37.8, lon: -122.41 },
  { name: "Inner Sunset", lat: 37.7601, lon: -122.4685 },
  { name: "Inner Richmond", lat: 37.7802, lon: -122.4644 },
  {
    name: "Chinatown",
    lat: 37.7941,
    lon: -122.4078,
    gapNote: "71% of companionship requests unanswered, most in Cantonese, weekday afternoons.",
  },
  {
    name: "Tenderloin",
    lat: 37.784,
    lon: -122.4144,
    gapNote: "Care and mobility requests go unmatched more than any other neighborhood.",
  },
  {
    name: "Bayview",
    lat: 37.7299,
    lon: -122.39,
    gapNote: "Ride-to-appointment requests are the most common unmatched need.",
  },
  {
    name: "Excelsior",
    lat: 37.7244,
    lon: -122.43,
    gapNote: "Senior social and household-help requests dominate the unmatched queue.",
  },
  {
    name: "SF State / Parkmerced",
    lat: 37.7241,
    lon: -122.4799,
    gapNote: "Campus micro-needs (chargers, textbooks) spike late afternoon.",
  },
];

function nearestNeighborhood(lat: number, lon: number): Neighborhood | null {
  let best: Neighborhood | null = null;
  let bestD = Infinity;
  for (const n of NEIGHBORHOODS) {
    // Rough planar distance in degrees is fine for "which cluster is this near".
    const d = (n.lat - lat) ** 2 + (n.lon - lon) ** 2;
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  // ~0.012 degrees ≈ 1km latitude; only label if genuinely close.
  return bestD < 0.012 ** 2 ? best : null;
}

// Aggregate per-(h3,family) rows into per-cell totals, attach neighborhood labels,
// and keep the busiest cells so the map stays legible.
export function toHexClusters(cells: BackendHexCell[], limit = 80): HexCluster[] {
  const byCell = new Map<string, { lat: number; lon: number; matched: number; unmatched: number }>();
  for (const c of cells) {
    const existing = byCell.get(c.h3);
    if (existing) {
      existing.matched += c.matched;
      existing.unmatched += c.unmatched;
    } else {
      byCell.set(c.h3, { lat: c.lat, lon: c.lon, matched: c.matched, unmatched: c.unmatched });
    }
  }

  const clusters: HexCluster[] = [];
  for (const [h3, agg] of byCell.entries()) {
    const hood = nearestNeighborhood(agg.lat, agg.lon);
    clusters.push({
      id: h3,
      name: hood?.name ?? "",
      lat: agg.lat,
      lon: agg.lon,
      matched: agg.matched,
      unmatched: agg.unmatched,
      ...(hood?.gapNote ? { gapNote: hood.gapNote } : {}),
    });
  }

  clusters.sort((a, b) => b.matched + b.unmatched - (a.matched + a.unmatched));
  return clusters.slice(0, limit);
}
