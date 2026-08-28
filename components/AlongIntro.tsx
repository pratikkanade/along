"use client";

import { useEffect, useState } from "react";

type Phase = "question" | "morph" | "resolved" | "exit";

export function AlongIntro({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("question");

  useEffect(() => {
    const toMorph = setTimeout(() => setPhase("morph"), 900);
    const toResolved = setTimeout(() => setPhase("resolved"), 1400);
    const toExit = setTimeout(() => setPhase("exit"), 2400);
    const finish = setTimeout(onDone, 2900);
    return () => {
      clearTimeout(toMorph);
      clearTimeout(toResolved);
      clearTimeout(toExit);
      clearTimeout(finish);
    };
  }, [onDone]);

  const resolved = phase === "resolved" || phase === "exit";

  return (
    <div className={`along-intro ${phase === "exit" ? "along-intro-exit" : ""}`}>
      <div className={`along-intro-word font-brand ${resolved ? "along-intro-word-resolved" : ""}`}>
        <span>Al</span>
        <span>o</span>
        <span>n</span>
        <span className="along-intro-swap">
          <span className={`along-intro-e ${phase !== "question" ? "along-intro-e-hide" : ""}`}>e</span>
          <span className={`along-intro-g ${resolved ? "along-intro-g-show" : ""}`}>g</span>
        </span>
        <span className={`along-intro-question ${phase !== "question" ? "along-intro-question-hide" : ""}`}>
          ?
        </span>
        <span className={`along-intro-star ${resolved ? "along-intro-star-show" : ""}`}>✨</span>
      </div>
    </div>
  );
}
