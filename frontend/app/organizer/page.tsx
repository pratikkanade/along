"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { HexMap } from "@/components/HexMap";
import { ApiError, getHex } from "@/lib/api";
import { toHexClusters } from "@/lib/adapters";
import type { HexCluster } from "@/lib/types";
import { hexClusters as sampleClusters } from "@/lib/mockData";

type Phase = "loading" | "ready" | "error";

export default function OrganizerPage() {
  const [clusters, setClusters] = useState<HexCluster[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [sampleMode, setSampleMode] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      // Fetch over a 14-day window so historical outcomes populate the map.
      const res = await getHex("posted", 336);
      setClusters(toHexClusters(res.data));
      setElapsedMs(res.meta.elapsed_ms);
      setUpdatedAt(new Date());
      setSampleMode(false);
      setPhase("ready");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Backend unreachable";
      setErrorMsg(message);
      setPhase((p) => (p === "loading" ? "error" : p)); // keep showing data on a failed refresh
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 6000); // real re-query; numbers move as events land
    return () => clearInterval(interval);
  }, [load]);

  function loadSample() {
    setClusters(sampleClusters);
    setSampleMode(true);
    setElapsedMs(null);
    setPhase("ready");
  }

  const totalMatched = clusters.reduce((sum, c) => sum + c.matched, 0);
  const totalUnmatched = clusters.reduce((sum, c) => sum + c.unmatched, 0);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 pt-safe pb-safe dark:bg-black sm:pt-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
            <span className="font-brand font-medium text-xl">Along</span> · Organizer
          </span>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Back to app
          </Link>
        </div>

        {phase === "error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              Could not load analytics from ClickHouse
            </p>
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => {
                  setPhase("loading");
                  void load();
                }}
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
        ) : (
          <>
            <div className="mb-6 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Active cells</p>
                <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                  {clusters.length}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Matched</p>
                <p className="text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {totalMatched}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Unmatched</p>
                <p className="text-2xl font-semibold tabular-nums text-red-500">{totalUnmatched}</p>
              </div>
            </div>

            {phase === "loading" ? (
              <div className="h-[520px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            ) : (
              <HexMap clusters={clusters} />
            )}

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
              <span>The live intents are synthetic; the query, schema and pipeline are real.</span>
              {sampleMode && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                  sample data
                </span>
              )}
              {!sampleMode && elapsedMs !== null && <span>· ClickHouse {elapsedMs}ms</span>}
              {!sampleMode && updatedAt && (
                <span>· updated {updatedAt.toLocaleTimeString([], { hour12: false })}</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
