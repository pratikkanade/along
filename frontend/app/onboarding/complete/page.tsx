"use client";

import { useRouter } from "next/navigation";
import { VoiceOrb } from "@/components/VoiceOrb";
import { markOnboarded } from "@/lib/onboarding";

export default function OnboardingCompletePage() {
  const router = useRouter();

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 pt-safe pb-safe text-center">
      <VoiceOrb state="idle" size={150} />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-900">Profile complete!</h1>
      <p className="mt-3 max-w-xs text-zinc-600">
        You&rsquo;ve joined <span className="font-semibold text-zinc-900">1,842</span> other people in your area who
        want to come Along.
      </p>

      <button
        onClick={() => {
          markOnboarded();
          router.push("/");
        }}
        className="mt-10 h-12 w-full max-w-xs rounded-full bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600"
      >
        Continue
      </button>
    </div>
  );
}
