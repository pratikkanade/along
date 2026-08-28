import { Match } from "@/lib/types";

function Chip({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "accent" | "trust" }) {
  const toneClasses = {
    default: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    accent: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    trust: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  }[tone];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses}`}>
      {children}
    </span>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const distanceLabel =
    match.distanceM < 1000 ? `${Math.round(match.distanceM)}m away` : `${(match.distanceM / 1000).toFixed(1)}km away`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
          style={{ backgroundColor: match.avatarColor }}
        >
          {match.displayName
            .split(" ")
            .map((p) => p[0])
            .join("")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">{match.displayName}</p>
            <span className="shrink-0 text-xs font-medium text-zinc-400">
              {Math.round(match.score * 100)}% match
            </span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">&ldquo;{match.rawText}&rdquo;</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <Chip>{distanceLabel}</Chip>
            <Chip>{match.overlapMinutes} min overlap</Chip>
            {match.adjacencyPath && (
              <Chip tone="accent">{match.adjacencyPath.join(" → ")}</Chip>
            )}
            {match.sharedLanguage && <Chip tone="accent">speaks {match.sharedLanguage}</Chip>}
            <Chip tone="trust">trust {match.trustScore.toFixed(1)}</Chip>
            {match.isSenior && <Chip>senior</Chip>}
            {match.verifiedOrg && <Chip>verified · {match.verifiedOrg}</Chip>}
          </div>
        </div>
      </div>
      <button className="mt-3 w-full rounded-full bg-zinc-900 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200">
        Say hi
      </button>
    </div>
  );
}
