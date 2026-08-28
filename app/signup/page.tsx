"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const CODE_LENGTH = 6;

function OtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "you@example.com";
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const setDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[index] = char;
      return next;
    });
    if (char && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const code = digits.join("");
  const complete = code.length === CODE_LENGTH;

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="along-glass w-full max-w-xs p-6 text-center">
        <span className="font-brand font-medium block text-3xl text-zinc-900">Along</span>
        <h1 className="mt-5 text-lg font-medium text-zinc-900">Check your email</h1>
        <p className="mt-1 text-sm text-zinc-600">
          We sent a 6-digit code to <span className="font-medium text-zinc-800">{email}</span>
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={digit}
              onChange={(e) => setDigit(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              inputMode="numeric"
              maxLength={1}
              className="h-12 w-10 rounded-xl border border-zinc-200 bg-white/70 text-center text-lg font-medium text-zinc-900 focus:border-violet-400 focus:outline-none"
            />
          ))}
        </div>

        <button
          onClick={() => router.push("/signup/welcome")}
          disabled={!complete}
          className="mt-6 h-12 w-full rounded-full bg-violet-500 text-sm font-semibold text-white transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          Verify
        </button>

        <button className="mt-3 text-xs font-medium text-zinc-500 hover:text-zinc-700">
          Resend code
        </button>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <OtpForm />
    </Suspense>
  );
}
