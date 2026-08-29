"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6 8-6s8 2 8 6" strokeLinecap="round" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "Home", Icon: HomeIcon, active: pathname === "/" },
    { href: "/profile", label: "Profile", Icon: ProfileIcon, active: pathname === "/profile" },
  ];

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-safe">
      <div className="along-glass pointer-events-auto mb-3 flex w-full max-w-xs items-center justify-around px-6 py-3">
        {tabs.map(({ href, label, Icon, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
              active ? "text-violet-600" : "text-zinc-400 hover:text-zinc-600"
            }`}
          >
            <Icon active={active} />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
