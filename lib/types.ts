export type Match = {
  id: string;
  displayName: string;
  avatarColor: string;
  activityLabel: string;
  requestedActivity: string;
  adjacencyPath?: string[];
  rawText: string;
  distanceM: number;
  overlapMinutes: number;
  sharedLanguage?: string;
  trustScore: number;
  score: number;
  isSenior?: boolean;
  verifiedOrg?: string;
};

export type HexCluster = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  matched: number;
  unmatched: number;
  gapNote?: string;
};
