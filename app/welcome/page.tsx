import Link from "next/link";
import { VoiceOrb } from "@/components/VoiceOrb";

export default function WelcomePage() {
  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-between px-6 pt-safe pb-safe">
      <div />

      <div className="flex flex-col items-center text-center">
        <VoiceOrb state="idle" size={140} />
        <h1 className="font-brand font-medium mt-6 text-5xl text-zinc-900">Along</h1>
        <h2 className="mt-6 max-w-xs text-2xl font-medium text-zinc-800">
          You don&rsquo;t have to do this alone.
        </h2>
        <p className="mt-3 max-w-xs text-sm text-zinc-600">
          Along finds people near you who want the same thing, right now — a walk, a coffee, a hand
          fixing a shelf, or just company.
        </p>
      </div>

      <div className="along-glass flex w-full max-w-xs flex-col items-center gap-3 p-4">
        <Link
          href="/login"
          className="h-12 w-full rounded-full bg-orange-500 text-center text-sm font-semibold leading-[3rem] text-white transition-colors hover:bg-orange-600"
        >
          Get started
        </Link>
        <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
          I already have an account
        </Link>
      </div>
    </div>
  );
}
