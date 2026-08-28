"use client";

import { useRouter } from "next/navigation";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function PostSignupWelcomePage() {
  const router = useRouter();

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 pt-safe pb-safe text-center">
      <VoiceOrb state="idle" size={120} />
      <h1 className="mt-6 text-2xl font-medium text-zinc-900">You&rsquo;re in.</h1>
      <p className="mt-3 max-w-xs text-sm text-zinc-600">
        Hey, I&rsquo;m Along. I&rsquo;m just going to ask you a few questions to set up your profile —
        it takes less than a minute.
      </p>

      <button
        onClick={() => router.push("/onboarding/choice")}
        className="mt-8 h-12 w-full max-w-xs rounded-full bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
      >
        Let&rsquo;s go
      </button>
    </div>
  );
}
