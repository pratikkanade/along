"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { findMatch } from "@/lib/matchStore";

type Message = { from: "me" | "them"; text: string };

function ChatInner() {
  const router = useRouter();
  const params = useSearchParams();
  const id = params.get("id") ?? "";
  const person = findMatch(id);

  const activity = person?.activityLabel?.toLowerCase() ?? "this";
  const seeded = useMemo<Message[]>(
    () => [
      { from: "them", text: `Hey! Saw you're down for ${activity} 🙌` },
      { from: "me", text: "Yes! Are you free in the next hour?" },
      { from: "them", text: "Works for me — want to meet at Dolores Park courts?" },
    ],
    [activity],
  );

  const [messages, setMessages] = useState<Message[]>(seeded);
  const [draft, setDraft] = useState("");

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { from: "me", text }]);
    setDraft("");
  }

  const name = person?.displayName ?? "Chat";
  const color = person?.avatarColor ?? "#8B5CF6";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("");

  return (
    <div className="along-gradient-bg flex flex-1 flex-col pt-safe">
      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4">
        {/* Header */}
        <div className="flex items-center gap-3 py-3">
          <button onClick={() => router.back()} className="text-zinc-600 hover:text-zinc-900" aria-label="Back">
            ←
          </button>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
            style={{ backgroundColor: color }}
          >
            {initials}
          </div>
          <span className="font-semibold text-zinc-900">{name}</span>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto py-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "me" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-3xl px-4 py-2.5 text-sm ${
                  m.from === "me"
                    ? "rounded-br-lg bg-zinc-200/70 text-zinc-900"
                    : "rounded-bl-lg bg-white/80 text-zinc-800"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 pb-safe">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Message…"
            className="h-12 flex-1 rounded-full border border-white/60 bg-white/70 px-5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-violet-300 focus:outline-none"
          />
          <button
            onClick={send}
            disabled={!draft.trim()}
            className="h-12 shrink-0 rounded-full bg-violet-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:bg-white/60 disabled:text-zinc-400"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="along-gradient-bg flex flex-1" />}>
      <ChatInner />
    </Suspense>
  );
}
