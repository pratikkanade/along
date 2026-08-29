// Tiny sessionStorage-backed cache so the immersive /match screen can hand off
// the current (real, backend-derived) match list to /match/person and /chat
// without threading full objects through query params. Falls back to mockMatches.

import { mockMatches } from "./mockData";
import type { Match } from "./types";

const KEY = "along_matches";

export function storeMatches(matches: Match[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(matches));
  } catch {
    // sessionStorage may be unavailable; detail screens fall back to mock.
  }
}

export function getStoredMatches(): Match[] {
  if (typeof window === "undefined") return mockMatches;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Match[];
  } catch {
    // ignore
  }
  return mockMatches;
}

export function findMatch(id: string): Match | undefined {
  return getStoredMatches().find((m) => m.id === id) ?? mockMatches.find((m) => m.id === id);
}
