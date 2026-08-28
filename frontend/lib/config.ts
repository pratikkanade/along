// Central demo + integration config for the Rally frontend.
// The backend is the source of truth for matching; these constants only cover
// what the UI needs that the API does not return (display names, colors, labels)
// plus the pinned demo identity that must match the seeded Postgres/ClickHouse rows.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

// Must match backend `npm run seed:demo` (Postgres) and db/clickhouse/seed.sql section 3a.
export const DEMO_USER_ID = "ddeb301a-f161-4c74-9fab-4fbfd4f54cc8";

// Pre-seeded live intent for the demo user (seed.sql 3a). Used as a fallback so the
// match query always has a real intent to run against, even if the live write fails.
export const SEEDED_DEMO_INTENT_ID = "00000000-0000-4000-8000-000000000002";

// Seeded neighborhood the demo user posts from. Real GPS may land outside the seeded
// clusters and return zero matches, so the consumer flow defaults here.
export const DEMO_LOCATION = { lat: 37.7599, lon: -122.4148, label: "Mission, San Francisco" };

// The demo user's languages (seed.sql 3a: ['en','es']). Used to compute the
// "shared language" chip client-side, since the match endpoint returns only the
// other person's languages.
export const DEMO_LANGUAGES = ["en", "es"];

export const DEMO_INTENT = "anyone want to play pickleball in the Mission in the next hour?";

const LANGUAGE_LABELS: Record<string, string> = {
  en: "English",
  es: "Spanish",
  zh: "Cantonese",
  pt: "Portuguese",
  tl: "Tagalog",
  ru: "Russian",
  vi: "Vietnamese",
};

export function languageLabel(code: string): string {
  return LANGUAGE_LABELS[code] ?? code;
}

const ACTIVITY_LABELS: Record<string, string> = {
  coffee_meetup: "Coffee",
  lunch_buddy: "Lunch",
  running_partner: "Running",
  companionship_visit: "Companionship visit",
  spare_period_product: "Spare period product",
  board_game_night: "Board game night",
  ride_to_medical_appointment: "Ride to appointment",
};

export function prettifyActivity(key: string): string {
  if (ACTIVITY_LABELS[key]) return ACTIVITY_LABELS[key];
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Deterministic keyword -> canonical activity_key. Sending a known activity_key lets
// the backend skip the OpenAI embedding call and use the precomputed taxonomy vector,
// which keeps the headline demo deterministic and offline-safe.
const ACTIVITY_KEYWORDS: [RegExp, string][] = [
  [/pickle ?ball/i, "pickleball"],
  [/tennis/i, "tennis"],
  [/badminton/i, "badminton"],
  [/squash/i, "squash"],
  [/table ?tennis|ping ?pong/i, "table_tennis"],
  [/basketball|hoops/i, "basketball_pickup"],
  [/soccer|f[uú]tbol/i, "soccer_pickup"],
  [/coffee|caf[eé]/i, "coffee_meetup"],
  [/lunch/i, "lunch_buddy"],
  [/\brun(ning)?\b/i, "running_partner"],
  [/hik(e|ing)/i, "hiking"],
  [/chess/i, "chess"],
  [/board ?game/i, "board_game_night"],
  [/shelf|mount|drill/i, "hang_shelf"],
  [/ride|lift|drive.*appointment|appointment/i, "ride_to_medical_appointment"],
  [/grocer/i, "grocery_run"],
  [/tampon|pad|period/i, "spare_period_product"],
  [/charger/i, "borrow_charger"],
  [/compan(y|ionship)|someone to (sit|talk)|tea/i, "companionship_visit"],
];

export function guessActivityKey(rawText: string): string | undefined {
  for (const [re, key] of ACTIVITY_KEYWORDS) {
    if (re.test(rawText)) return key;
  }
  return undefined;
}

// ISO window: now .. now + 3h, matching the seed's live-intent window pattern.
export function buildWindow(): { window_start: string; window_end: string } {
  const now = new Date();
  const end = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return { window_start: now.toISOString(), window_end: end.toISOString() };
}

const NAMES = [
  "Priya K.", "Marcus T.", "Lin W.", "Sofia R.", "Grace C.", "Diego M.", "Amara O.",
  "Kenji S.", "Nadia H.", "Tomas V.", "Wei L.", "Rosa E.", "Jamal B.", "Yuki N.",
  "Elena P.", "Andre F.", "Mei Z.", "Carlos D.", "Fatima A.", "Sam H.",
];

const COLORS = [
  "#F97316", "#0EA5E9", "#22C55E", "#A855F7", "#EAB308", "#EC4899", "#14B8A6", "#6366F1",
];

function hashString(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pseudoName(userId: string): string {
  return NAMES[hashString(userId) % NAMES.length];
}

export function avatarColor(userId: string): string {
  return COLORS[hashString(userId + "c") % COLORS.length];
}
