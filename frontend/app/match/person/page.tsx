"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { findMatch } from "@/lib/matchStore";

function PersonInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const person = findMatch(id);

  if (!person) {
    return (
      <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-zinc-600">We couldn&rsquo;t find that person anymore.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-full bg-violet-500 px-6 py-2 text-sm font-semibold text-white"
        >
          Back home
        </button>
      </div>
    );
  }

  const distanceLabel =
    person.distanceM < 1000
      ? `${Math.round(person.distanceM)}m`
      : `${(person.distanceM / 1000).toFixed(1)}km`;

  return (
    <div className="along-gradient-bg flex flex-1 flex-col px-4 pt-safe pb-safe sm:pt-6">
      <div className="mx-auto w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="mb-4 flex items-center gap-1 text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back
        </button>

        <div className="along-glass flex flex-col items-center p-6 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white"
            style={{ backgroundColor: person.avatarColor }}
          >
            {person.displayName
              .split(" ")
              .map((p) => p[0])
              .join("")}
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900">{person.displayName}</h1>
          <p className="mt-1 text-sm text-zinc-500">{person.activityLabel}</p>

          <p className="mt-4 text-sm text-zinc-700">&ldquo;{person.rawText}&rdquo;</p>

          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {person.activityLabel}
            </span>
            {person.sharedLanguage && (
              <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                speaks {person.sharedLanguage}
              </span>
            )}
            {person.isSenior && (
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">senior</span>
            )}
            {person.verifiedOrg && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                verified · {person.verifiedOrg}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="along-glass p-4 text-center">
            <p className="text-xs text-zinc-500">Trust score</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-600">{person.trustScore.toFixed(1)}</p>
          </div>
          <div className="along-glass p-4 text-center">
            <p className="text-xs text-zinc-500">Distance</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900">{distanceLabel}</p>
          </div>
        </div>

        <Link
          href={`/chat?id=${encodeURIComponent(person.id)}`}
          className="mt-6 block h-12 w-full rounded-full bg-violet-500 text-center text-sm font-semibold leading-[3rem] text-white transition-colors hover:bg-violet-600"
        >
          Start chat
        </Link>
      </div>
    </div>
  );
}

export default function PersonPage() {
  return (
    <Suspense fallback={<div className="along-gradient-bg flex flex-1" />}>
      <PersonInner />
    </Suspense>
  );
}
