"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { VoiceInput } from "@/components/VoiceInput";
import { MatchCard } from "@/components/MatchCard";
import { ApiError, getMatches, postIntent } from "@/lib/api";
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
import type { Match } from "@/lib/types";
import { mockMatches, MOCK_ELAPSED_MS } from "@/lib/mockData";
import { hasOnboarded, resetOnboarding } from "@/lib/onboarding";

type Phase = "idle" | "loading" | "results" | "error";

export default function Home() {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [ready, setReady] = useState(false);

  const [phase, setPhase] = useState<Phase>("idle");
  const [matches, setMatches] = useState<Match[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [writeLive, setWriteLive] = useState(false); // true when the live dual-write succeeded
  const [sampleMode, setSampleMode] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (hasOnboarded()) {
        setReady(true);
      } else {
        router.replace("/welcome");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  async function runSearch(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmittedText(trimmed);
    setPhase("loading");
    setErrorMsg(null);
    setSampleMode(false);
    setWriteLive(false);

    // Step 1: try the live dual-write. On failure, fall back to the pre-seeded demo
    // intent so the match query (real ClickHouse) still runs.
    let intentId = SEEDED_DEMO_INTENT_ID;
    let myActivityKey = "pickleball";
    try {
      const activityKey = guessActivityKey(trimmed);
      const { window_start, window_end } = buildWindow();
      const res = await postIntent({
        user_id: DEMO_USER_ID,
        raw_text: trimmed,
        ...(activityKey ? { activity_key: activityKey } : {}),
        lat: DEMO_LOCATION.lat,
        lon: DEMO_LOCATION.lon,
        window_start,
        window_end,
      });
      intentId = res.data.intent_id;
      myActivityKey = res.data.activity_key;
      setWriteLive(true);
    } catch {
      // Keep the seeded fallback; still a real match query.
      setWriteLive(false);
    }

    // Step 2: fetch ranked matches from ClickHouse.
    try {
      const res = await getMatches(intentId, 10);
      setMatches(res.data.map((m) => toMatch(m, myActivityKey, DEMO_LANGUAGES)));
      setElapsedMs(res.meta.elapsed_ms);
      setPhase("results");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong reaching the backend";
      setErrorMsg(message);
      setPhase("error");
    }
  }

  function loadSample() {
    setMatches(mockMatches);
    setElapsedMs(MOCK_ELAPSED_MS);
    setSampleMode(true);
    setWriteLive(false);
    setPhase("results");
  }

  function reset() {
    setPhase("idle");
    setIntent("");
    setSubmittedText("");
    setErrorMsg(null);
    setSampleMode(false);
  }

  if (!ready) {
    return <div className="along-gradient-bg flex flex-1" />;
  }

  const showForm = phase === "idle";

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 pt-safe pb-safe dark:bg-black sm:pt-16">
      <div className="flex w-full max-w-xl flex-col items-center">
        <div className="mb-8 flex w-full items-center justify-between">
          <span className="font-brand font-medium text-xl text-zinc-900 dark:text-zinc-50">Along</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                resetOnboarding();
                router.push("/welcome");
              }}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Reset demo
            </button>
            <Link
              href="/organizer"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Organizer view →
            </Link>
          </div>
        </div>

        {showForm ? (
          <>
            <h1 className="mb-2 text-center text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              I&rsquo;m free right now.
            </h1>
            <p className="mb-8 text-center text-zinc-500 dark:text-zinc-400">
              Say what you want to do — we&rsquo;ll find people nearby, right now.
            </p>

            <div className="flex w-full items-center gap-2">
              <input
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch(intent)}
                placeholder={DEMO_INTENT}
                className="h-12 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <VoiceInput onTranscript={(text) => setIntent(text)} />
            </div>

            <button
              onClick={() => runSearch(intent)}
              disabled={!intent.trim()}
              className="mt-4 h-12 w-full rounded-full bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800"
            >
              Find people right now
            </button>

            <button
              onClick={() => {
                setIntent(DEMO_INTENT);
                runSearch(DEMO_INTENT);
              }}
              className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Try the demo intent
            </button>
            <p className="mt-2 text-[11px] text-zinc-400">Matching near {DEMO_LOCATION.label}</p>
          </>
        ) : (
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">You said:</p>
                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">
                  &ldquo;{submittedText}&rdquo;
                </p>
              </div>
              <button
                onClick={reset}
                className="shrink-0 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Start over
              </button>
            </div>

            {phase === "loading" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-zinc-400">Searching live intents…</p>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                  />
                ))}
              </div>
            )}

            {phase === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                  Could not reach the matching engine
                </p>
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => runSearch(submittedText)}
                    className="rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                  <button
                    onClick={loadSample}
                    className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900"
                  >
                    Show sample data
                  </button>
                </div>
              </div>
            )}

            {phase === "results" && (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {matches.length} matches found{elapsedMs !== null ? ` in ${elapsedMs}ms` : ""}
                  </p>
                  {sampleMode ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      sample data
                    </span>
                  ) : writeLive ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      posted live · dual-write
                    </span>
                  ) : (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      live query · seeded intent
                    </span>
                  )}
                </div>

                {matches.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No one nearby wants this right now. Try a broader activity or a wider window.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {matches.map((match) => (
                      <MatchCard key={match.id} match={match} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
