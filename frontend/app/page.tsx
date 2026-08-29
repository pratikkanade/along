"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceInput } from "@/components/VoiceInput";
import { BottomNav } from "@/components/BottomNav";
import { DEMO_INTENT } from "@/lib/config";
import { currentUser, neighborhoodFeed, suggestionPills } from "@/lib/mockData";
import { hasOnboarded } from "@/lib/onboarding";

export default function Home() {
  const router = useRouter();
  const [intent, setIntent] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (hasOnboarded()) setReady(true);
      else router.replace("/welcome");
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  function submit(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(`/match?intent=${encodeURIComponent(trimmed)}`);
  }

  if (!ready) return <div className="along-gradient-bg flex flex-1" />;

  return (
    <div className="along-gradient-bg flex flex-1 flex-col px-4 pt-safe pb-28 sm:pt-12">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <span className="font-brand mb-6 text-xl font-medium text-zinc-900">Along</span>

        <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Hi {currentUser.name}!</h1>
        <p className="mt-1 text-zinc-500">What do you want to do right now?</p>

        <div className="mt-6 flex items-center gap-2">
          <input
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit(intent)}
            placeholder={DEMO_INTENT}
            className="h-12 flex-1 rounded-full border border-white/60 bg-white/70 px-5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none"
          />
          <VoiceInput onTranscript={(text) => setIntent(text)} />
        </div>

        <button
          onClick={() => submit(intent)}
          disabled={!intent.trim()}
          className="mt-4 h-12 w-full rounded-full bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-white/60 disabled:text-zinc-400"
        >
          Find people right now
        </button>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {suggestionPills.map((pill) => (
            <button
              key={pill}
              onClick={() => submit(pill)}
              className="shrink-0 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-white"
            >
              {pill}
            </button>
          ))}
        </div>

        <h2 className="mt-8 mb-3 text-sm font-semibold text-zinc-500">Happening near you</h2>
        <div className="flex flex-col gap-3">
          {neighborhoodFeed.map((post) => (
            <button
              key={post.id}
              onClick={() => submit(post.text)}
              className="along-glass flex items-start gap-3 p-4 text-left transition-shadow hover:shadow-md"
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: post.avatarColor }}
              >
                {post.initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">{post.name}</p>
                  <span className="shrink-0 text-xs text-zinc-400">{post.timeAgo}</span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-600">{post.text}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
