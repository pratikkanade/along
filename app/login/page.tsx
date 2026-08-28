"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

function OAuthButton({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white/70 text-sm font-medium text-zinc-800 transition-colors hover:bg-white"
    >
      {icon}
      {label}
    </button>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");

  return (
    <div className="along-gradient-bg flex flex-1 flex-col items-center justify-center px-6 pt-safe pb-safe">
      <div className="along-glass w-full max-w-xs p-6">
        <span className="font-brand font-medium block text-center text-3xl text-zinc-900">Along</span>

        <div className="mt-5 flex rounded-full bg-zinc-900/5 p-1">
          <button
            onClick={() => setMode("signup")}
            className={`h-9 flex-1 rounded-full text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Sign up
          </button>
          <button
            onClick={() => setMode("login")}
            className={`h-9 flex-1 rounded-full text-sm font-medium transition-colors ${
              mode === "login" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500"
            }`}
          >
            Log in
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <OAuthButton
            label="Continue with Google"
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
                />
              </svg>
            }
          />
          <OAuthButton
            label="Continue with Apple"
            icon={
              <svg width="14" height="16" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
              </svg>
            }
          />
        </div>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-900/10" />
          <span className="text-xs text-zinc-500">or</span>
          <div className="h-px flex-1 bg-zinc-900/10" />
        </div>

        <label className="mb-1.5 block text-xs font-medium text-zinc-600">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 w-full rounded-full border border-zinc-200 bg-white/70 px-5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
        />

        <button
          onClick={() => router.push(`/signup?email=${encodeURIComponent(email)}`)}
          disabled={!email.trim()}
          className="mt-4 h-12 w-full rounded-full bg-orange-500 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {mode === "signup" ? "Continue" : "Log in"}
        </button>
      </div>
    </div>
  );
}
