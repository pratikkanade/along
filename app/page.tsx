"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlongIntro } from "@/components/AlongIntro";
import { VoiceInput } from "@/components/VoiceInput";
import { MatchCard } from "@/components/MatchCard";
import { DEMO_INTENT, MOCK_ELAPSED_MS, mockMatches } from "@/lib/mockData";
import { hasOnboarded, resetOnboarding } from "@/lib/onboarding";

export default function Home() {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [posted, setPosted] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [ready, setReady] = useState(false);

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

  const handlePost = () => {
    if (!intent.trim()) return;
    setPosted(true);
  };

  const reset = () => {
    setPosted(false);
    setIntent("");
  };

  if (!ready) {
    return <div className="along-gradient-bg flex flex-1" />;
  }

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 pt-safe pb-safe dark:bg-black sm:pt-16">
      {showIntro && <AlongIntro onDone={() => setShowIntro(false)} />}
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

        {!posted ? (
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
                onKeyDown={(e) => e.key === "Enter" && handlePost()}
                placeholder={DEMO_INTENT}
                className="h-12 flex-1 rounded-full border border-zinc-200 bg-white px-5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <VoiceInput onTranscript={(text) => setIntent(text)} />
            </div>

            <button
              onClick={handlePost}
              disabled={!intent.trim()}
              className="mt-4 h-12 w-full rounded-full bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:disabled:bg-zinc-800"
            >
              Find people right now
            </button>

            <button
              onClick={() => {
                setIntent(DEMO_INTENT);
                setPosted(true);
              }}
              className="mt-3 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Try the demo intent
            </button>
          </>
        ) : (
          <div className="w-full">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">You said:</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-50">&ldquo;{intent}&rdquo;</p>
              </div>
              <button
                onClick={reset}
                className="shrink-0 text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              >
                Start over
              </button>
            </div>

            <p className="mb-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {mockMatches.length} matches found in {MOCK_ELAPSED_MS}ms
            </p>

            <div className="flex flex-col gap-3">
              {mockMatches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
