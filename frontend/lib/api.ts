// Typed client for the Rally backend (Fastify, default http://localhost:4000).
// Every network call to the backend goes through here.

import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError(0, "network_error", `Cannot reach the backend at ${API_BASE_URL}`);
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError(res.status, err.code ?? "unknown", err.message ?? res.statusText);
  }
  return body as T;
}

// ---- POST /api/intents ----
export type PostIntentInput = {
  user_id: string;
  raw_text: string;
  activity_key?: string;
  lat: number;
  lon: number;
  window_start: string;
  window_end: string;
  intent_id?: string;
};

export type PostIntentResponse = {
  data: {
    intent_id: string;
    user_id: string;
    activity_key: string;
    family_key: string;
    status: string;
    created_at: string;
  };
};

export function postIntent(input: PostIntentInput): Promise<PostIntentResponse> {
  return request<PostIntentResponse>("/api/intents", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- GET /api/matches ----
export type BackendMatch = {
  intent_id: string;
  user_id: string;
  activity_key: string;
  family_key: string;
  raw_text: string;
  location: { lat: number; lon: number };
  languages: string[];
  verified_org: boolean;
  score: number;
  explanation: {
    distance_m: number;
    overlap_minutes: number;
    adjacency_path: string;
    trust_score: number;
  };
  score_breakdown: {
    vector_similarity: number;
    distance: number;
    time_overlap: number;
    trust: number;
    same_family: boolean;
  };
};

export type MatchesResponse = {
  data: BackendMatch[];
  meta: { source_intent_id: string; count: number; elapsed_ms: number };
};

export function getMatches(intentId: string, limit = 10): Promise<MatchesResponse> {
  const params = new URLSearchParams({ intent_id: intentId, limit: String(limit) });
  return request<MatchesResponse>(`/api/matches?${params.toString()}`);
}

// ---- GET /api/hex ----
export type BackendHexCell = {
  h3: string;
  lat: number;
  lon: number;
  family_key: string;
  posted: number;
  matched: number;
  unmatched: number;
  users: number;
  value: number;
};

export type HexResponse = {
  data: BackendHexCell[];
  meta: {
    metric: string;
    hours: number;
    family_key: string | null;
    count: number;
    elapsed_ms: number;
  };
};

export function getHex(
  metric: "posted" | "matched" | "unmatched" = "posted",
  hours = 336,
  familyKey?: string,
): Promise<HexResponse> {
  const params = new URLSearchParams({ metric, hours: String(hours) });
  if (familyKey) params.set("family_key", familyKey);
  return request<HexResponse>(`/api/hex?${params.toString()}`);
}
