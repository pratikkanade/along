"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { BottomNav } from "@/components/BottomNav";
import { currentUser } from "@/lib/mockData";
import { resetOnboarding } from "@/lib/onboarding";

export default function ProfilePage() {
  const router = useRouter();

  return (
    <div className="along-gradient-bg flex flex-1 flex-col px-4 pt-safe pb-28 sm:pt-12">
      <div className="mx-auto w-full max-w-xl">
        <span className="font-brand mb-6 block text-xl font-medium text-zinc-900">Along</span>

        <div className="along-glass flex flex-col items-center p-6 text-center">
          <div
            className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-semibold text-white"
            style={{ backgroundColor: currentUser.avatarColor }}
          >
            {currentUser.initial}
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-zinc-900">{currentUser.name}</h1>
          <p className="mt-1 text-zinc-500">Trust score {currentUser.trustScore.toFixed(1)}</p>

          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {currentUser.interests.map((interest) => (
              <span key={interest} className="text-sm font-medium text-violet-600">
                {interest}
              </span>
            ))}
          </div>
        </div>

        <div className="along-glass mt-6 divide-y divide-white/50">
          <Link
            href="/organizer"
            className="flex items-center justify-between px-5 py-4 text-zinc-900 transition-colors hover:bg-white/40"
          >
            <span className="font-medium">Organizer view</span>
            <span className="text-zinc-400">→</span>
          </Link>
          <button
            onClick={() => {
              resetOnboarding();
              router.push("/welcome");
            }}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-zinc-500 transition-colors hover:bg-white/40"
          >
            <span className="font-medium">Reset demo</span>
            <span className="text-zinc-400">→</span>
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
