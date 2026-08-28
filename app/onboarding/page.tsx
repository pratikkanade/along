"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Chip = { id: string; label: string };

function ChipRow({
  chips,
  onRemove,
  tone = "default",
}: {
  chips: Chip[];
  onRemove: (id: string) => void;
  tone?: "default" | "accent";
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            tone === "accent"
              ? "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {chip.label}
          <button
            onClick={() => onRemove(chip.id)}
            aria-label={`Remove ${chip.label}`}
            className="text-current opacity-50 hover:opacity-100"
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

export default function OnboardingConfirmPage() {
  const router = useRouter();
  const [interests, setInterests] = useState<Chip[]>([
    { id: "pickleball", label: "Pickleball" },
    { id: "tennis", label: "Tennis" },
    { id: "board-games", label: "Board games" },
    { id: "coffee", label: "Coffee chats" },
  ]);
  const [languages, setLanguages] = useState<Chip[]>([
    { id: "en", label: "English" },
    { id: "es", label: "Spanish" },
  ]);
  const [availability, setAvailability] = useState<Chip[]>([
    { id: "weekday-evening", label: "Weekday evenings" },
    { id: "weekend-morning", label: "Weekend mornings" },
  ]);

  const remove = (setter: typeof setInterests) => (id: string) =>
    setter((prev) => prev.filter((c) => c.id !== id));

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center px-4 pt-safe pb-safe sm:pt-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <span className="font-brand font-medium text-xl text-zinc-900">Along</span>
          <Link href="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Skip
          </Link>
        </div>

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-orange-600">Step 3 of 4</p>
        <h1 className="mb-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Here&rsquo;s what I heard
        </h1>
        <p className="mb-6 text-sm text-zinc-600">
          From your voice intro. Tap × to remove anything that&rsquo;s wrong — we&rsquo;ll learn the rest as you use Along.
        </p>

        <div className="along-glass flex flex-col gap-5 p-5">
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-500">Interests</p>
            <ChipRow chips={interests} onRemove={remove(setInterests)} tone="accent" />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-500">Languages</p>
            <ChipRow chips={languages} onRemove={remove(setLanguages)} />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold text-zinc-500">Usually free</p>
            <ChipRow chips={availability} onRemove={remove(setAvailability)} />
          </div>
        </div>

        <div className="along-glass mt-4 p-5">
          <p className="mb-3 text-xs font-semibold text-zinc-500">Safety, from your taps earlier</p>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-zinc-600">Comfortable meeting</dt>
            <dd className="text-right font-medium text-zinc-900">Anyone</dd>
            <dt className="text-zinc-600">Meeting places</dt>
            <dd className="text-right font-medium text-zinc-900">Public only</dd>
            <dt className="text-zinc-600">Radius</dt>
            <dd className="text-right font-medium text-zinc-900">Walk · 1km</dd>
          </dl>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 h-12 w-full rounded-full bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
        >
          Looks right — continue
        </button>
      </div>
    </div>
  );
}
