"use client";

import { useEffect, useState } from "react";

type Phase = "question" | "morph" | "resolved";

export function AlongIntro({ className = "" }: { className?: string }) {
  const [phase, setPhase] = useState<Phase>("question");
  const [letter, setLetter] = useState<"e" | "g">("e");

  useEffect(() => {
    const toMorph = setTimeout(() => setPhase("morph"), 900);
    const toSwapLetter = setTimeout(() => setLetter("g"), 1120);
    const toResolved = setTimeout(() => setPhase("resolved"), 1400);
    return () => {
      clearTimeout(toMorph);
      clearTimeout(toSwapLetter);
      clearTimeout(toResolved);
    };
  }, []);

  const resolved = phase === "resolved";

  return (
    <span className={`along-intro-word font-brand ${resolved ? "along-intro-word-resolved" : ""} ${className}`}>
      <span>Al</span>
      <span>o</span>
      <span>n</span>
      <span className={`along-intro-letter ${phase === "morph" ? "along-intro-letter-flip" : ""}`}>
        {letter}
      </span>
      <span className={`along-intro-question ${phase !== "question" ? "along-intro-question-hide" : ""}`}>
        ?
      </span>
    </span>
  );
}
