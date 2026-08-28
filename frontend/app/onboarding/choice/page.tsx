"use client";

import { useRouter } from "next/navigation";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function OnboardingChoicePage() {
  const router = useRouter();

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 pt-safe pb-safe">
      <h1 className="text-center text-2xl font-medium text-zinc-900">How do you want to do this?</h1>
      <p className="mt-2 max-w-xs text-center text-sm text-zinc-600">
        Either way takes about the same time — pick whatever feels easier right now.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-4">
        <button
          onClick={() => router.push("/onboarding/voice")}
          className="along-glass flex flex-col items-center gap-3 p-6 text-center transition-transform hover:scale-[1.02]"
        >
          <VoiceOrb state="idle" size={64} />
          <span className="text-base font-medium text-zinc-900">Talk it through</span>
          <span className="text-xs text-zinc-600">Along asks, you just talk</span>
        </button>

        <button
          onClick={() => router.push("/onboarding")}
          className="along-glass flex flex-col items-center gap-3 p-6 text-center transition-transform hover:scale-[1.02]"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900/5 text-2xl">
            ⌨️
          </div>
          <span className="text-base font-medium text-zinc-900">Type it out</span>
          <span className="text-xs text-zinc-600">Fill it in yourself, at your pace</span>
        </button>
      </div>
    </div>
  );
}
