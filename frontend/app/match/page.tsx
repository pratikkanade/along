"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MatchCard } from "@/components/MatchCard";
import { VoiceOrb } from "@/components/VoiceOrb";
import { getMatches, postIntent } from "@/lib/api";
import { toMatch } from "@/lib/adapters";
import {
  buildWindow,
  DEMO_INTENT,
  DEMO_LANGUAGES,
  DEMO_LOCATION,
  DEMO_USER_ID,
  guessActivityKey,
  SEEDED_DEMO_INTENT_ID,
} from "@/lib/config";
import { mockMatches } from "@/lib/mockData";
import { storeMatches } from "@/lib/matchStore";
import type { Match } from "@/lib/types";

type Phase = "thinking" | "results";

function MatchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const intent = params.get("intent")?.trim() || DEMO_INTENT;

  const [phase, setPhase] = useState<Phase>("thinking");
  const [matches, setMatches] = useState<Match[]>([]);
  const [selected, setSelected] = useState<Match | null>(null);
  const [note, setNote] = useState<string>("Finding nearby people who want to come Along…");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // guard against double-invoke in dev strict mode
    ran.current = true;

    (async () => {
      // Real dual-write, then real match query; fall back to the seeded demo intent,
      // and finally to sample data, so the screen always resolves to something.
      let intentId = SEEDED_DEMO_INTENT_ID;
      let myActivityKey = "pickleball";
      try {
        const activityKey = guessActivityKey(intent);
        const { window_start, window_end } = buildWindow();
        const res = await postIntent({
          user_id: DEMO_USER_ID,
          raw_text: intent,
          ...(activityKey ? { activity_key: activityKey } : {}),
          lat: DEMO_LOCATION.lat,
          lon: DEMO_LOCATION.lon,
          window_start,
          window_end,
        });
        intentId = res.data.intent_id;
        myActivityKey = res.data.activity_key;
      } catch {
        // keep seeded fallback
      }

      try {
        const res = await getMatches(intentId, 10);
        const mapped = res.data.map((m) => toMatch(m, myActivityKey, DEMO_LANGUAGES));
        setMatches(mapped);
        storeMatches(mapped);
      } catch {
        setMatches(mockMatches);
        storeMatches(mockMatches);
      }

      setNote("");
      setPhase("results");
    })();
  }, [intent]);

  const count = matches.length;

  return (
    <div className="along-gradient-bg flex flex-1 flex-col px-4 pt-safe pb-safe sm:pt-6">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <div className="mb-2 flex items-center">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
          >
            ← Back
          </button>
        </div>

        <div className="mb-4 flex justify-center">
          <VoiceOrb state={phase === "thinking" ? "speaking" : "idle"} size={120} />
        </div>

        {/* You bubble */}
        <div className="mb-3 flex justify-end">
          <div className="max-w-[75%] rounded-3xl rounded-br-lg bg-zinc-200/70 px-4 py-3 text-sm text-zinc-900">
            {intent}
          </div>
        </div>

        {/* Along bubbles */}
        <div className="mb-3 flex justify-start">
          <div className="max-w-[80%] rounded-3xl rounded-bl-lg bg-white/70 px-4 py-3 text-sm text-zinc-700">
            {phase === "thinking" ? note : "Finding nearby people who want to come Along…"}
          </div>
        </div>

        {phase === "results" && (
          <div className="mb-4 flex justify-start">
            <div className="max-w-[80%] rounded-3xl rounded-bl-lg bg-white/70 px-4 py-3 text-sm text-zinc-700">
              {count > 0
                ? `We found ${count} ${count === 1 ? "person" : "people"} interested in joining!`
                : "No one nearby wants this right now — try a broader activity or a wider window."}
            </div>
          </div>
        )}

        {/* Match cards */}
        {phase === "results" && (
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <div
                key={match.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(match)}
                onKeyDown={(e) => e.key === "Enter" && setSelected(match)}
                className="cursor-pointer rounded-2xl focus:outline-none focus:ring-2 focus:ring-violet-300"
              >
                <MatchCard match={match} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom sheet */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-zinc-900/20 backdrop-blur-sm" />
          <div
            className="along-glass relative mb-4 w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-4 text-center text-lg font-semibold text-zinc-900">{selected.displayName}</p>
            <div className="flex flex-col gap-2">
              <Link
                href={`/match/person?id=${encodeURIComponent(selected.id)}`}
                className="h-12 w-full rounded-full bg-white/80 text-center text-sm font-semibold leading-[3rem] text-zinc-900 transition-colors hover:bg-white"
              >
                View profile
              </Link>
              <Link
                href={`/chat?id=${encodeURIComponent(selected.id)}`}
                className="h-12 w-full rounded-full bg-violet-500 text-center text-sm font-semibold leading-[3rem] text-white transition-colors hover:bg-violet-600"
              >
                Start chat
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="along-gradient-bg flex flex-1" />}>
      <MatchInner />
    </Suspense>
  );
}
