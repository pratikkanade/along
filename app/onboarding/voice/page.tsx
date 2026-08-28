"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceOrb } from "@/components/VoiceOrb";

type Phase = "speaking" | "listening";

type Turn = { speaker: "along" | "you"; text: string };

const QUESTIONS: { question: string; answer: string }[] = [
  { question: "Hey, I'm Along. What should I call you?", answer: "Sanjana" },
  { question: "Nice to meet you. How old are you?", answer: "27" },
  { question: "What do you like doing with a free hour?", answer: "Pickleball, coffee, board games" },
  { question: "Anything you've been meaning to try?", answer: "Tennis, actually" },
  { question: "When are you usually free?", answer: "Weekday evenings and weekend mornings" },
  { question: "What languages do you speak?", answer: "English and Spanish" },
];

const SPEAKING_MS = 1700;
const LISTENING_MS = 1600;
const PAUSE_MS = 700;

export default function VoiceOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<Phase>("speaking");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isDone = step >= QUESTIONS.length;

  useEffect(() => {
    if (isDone) {
      const t = setTimeout(() => router.push("/onboarding"), 1400);
      return () => clearTimeout(t);
    }

    const current = QUESTIONS[step];
    const toSpeaking = setTimeout(() => {
      setPhase("speaking");
      setTurns((prev) => [...prev, { speaker: "along", text: current.question }]);
    }, 0);

    const toListening = setTimeout(() => setPhase("listening"), SPEAKING_MS);
    const toAnswer = setTimeout(() => {
      setTurns((prev) => [...prev, { speaker: "you", text: current.answer }]);
    }, SPEAKING_MS + LISTENING_MS);
    const toNext = setTimeout(() => setStep((s) => s + 1), SPEAKING_MS + LISTENING_MS + PAUSE_MS);

    return () => {
      clearTimeout(toSpeaking);
      clearTimeout(toListening);
      clearTimeout(toAnswer);
      clearTimeout(toNext);
    };
  }, [step, isDone, router]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  const orbState = isDone ? "idle" : phase === "listening" ? "listening" : "speaking";

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center px-6 pt-safe pb-safe">
      <div className="mt-8">
        <VoiceOrb state={orbState} size={128} />
      </div>

      <p className="mt-4 text-sm font-medium text-zinc-600">
        {isDone
          ? "Got it — pulling that together…"
          : phase === "speaking"
            ? "Along is talking…"
            : "Listening…"}
      </p>

      <div ref={scrollRef} className="mt-6 flex w-full max-w-xs flex-1 flex-col gap-2 overflow-y-auto">
        {turns.map((turn, i) => (
          <div
            key={i}
            className={`along-glass max-w-[85%] px-4 py-2.5 text-sm ${
              turn.speaker === "along" ? "self-start text-zinc-800" : "self-end bg-violet-500/15 text-zinc-900"
            }`}
          >
            {turn.text}
          </div>
        ))}
      </div>
    </div>
  );
}
