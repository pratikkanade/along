"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HexMap } from "@/components/HexMap";
import { hexClusters } from "@/lib/mockData";

export default function OrganizerPage() {
  const [liveCount, setLiveCount] = useState(1800);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount((c) => c + Math.round(Math.random() * 3));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const totalUnmatched = hexClusters.reduce((sum, c) => sum + c.unmatched, 0);
  const totalMatched = hexClusters.reduce((sum, c) => sum + c.matched, 0);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 px-4 pt-safe pb-safe dark:bg-black sm:pt-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Rally · Organizer
          </span>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
          >
            ← Back to app
          </Link>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Live intents (6h)</p>
            <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">{liveCount}</p>
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

        <HexMap clusters={hexClusters} />

        <p className="mt-4 text-xs text-zinc-400">
          The 1,800 live intents are synthetic; the query, schema and pipeline are real.
        </p>
      </div>
    </div>
  );
}
