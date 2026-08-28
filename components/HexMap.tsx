"use client";

import { useState } from "react";
import { HexCluster } from "@/lib/types";

const LAT_MIN = 37.715;
const LAT_MAX = 37.81;
const LON_MIN = -122.49;
const LON_MAX = -122.385;
const WIDTH = 640;
const HEIGHT = 520;

function project(lat: number, lon: number) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * WIDTH;
  const y = HEIGHT - ((lat - LAT_MIN) / (LAT_MAX - LAT_MIN)) * HEIGHT;
  return { x, y };
}

export function HexMap({ clusters }: { clusters: HexCluster[] }) {
  const [showUnmatchedOnly, setShowUnmatchedOnly] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const maxCount = Math.max(...clusters.map((c) => c.matched + c.unmatched));

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {showUnmatchedOnly ? "Unmatched demand — the loneliness gap" : "Live activity"}
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-500">
          <input
            type="checkbox"
            checked={showUnmatchedOnly}
            onChange={(e) => setShowUnmatchedOnly(e.target.checked)}
            className="h-3.5 w-3.5 accent-orange-500"
          />
          Show unmatched only
        </label>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full rounded-lg bg-zinc-50 dark:bg-black">
        {clusters.map((c) => {
          const { x, y } = project(c.lat, c.lon);
          const value = showUnmatchedOnly ? c.unmatched : c.matched + c.unmatched;
          const radius = 10 + (value / maxCount) * 34;
          const unmatchedRatio = c.unmatched / (c.matched + c.unmatched);
          const color = showUnmatchedOnly
            ? "#EF4444"
            : unmatchedRatio > 0.5
            ? "#EF4444"
            : unmatchedRatio > 0.25
            ? "#F59E0B"
            : "#22C55E";

          return (
            <g
              key={c.id}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer"
            >
              <circle cx={x} cy={y} r={radius} fill={color} fillOpacity={0.35} stroke={color} strokeWidth={1.5} />
              <circle cx={x} cy={y} r={3} fill={color} />
              <text
                x={x}
                y={y - radius - 6}
                textAnchor="middle"
                className="fill-zinc-500 text-[9px] font-medium dark:fill-zinc-400"
              >
                {c.name}
              </text>
            </g>
          );
        })}
      </svg>

      {hovered && (
        <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-xs dark:bg-zinc-800">
          {(() => {
            const c = clusters.find((cl) => cl.id === hovered)!;
            return (
              <>
                <p className="font-semibold text-zinc-900 dark:text-zinc-50">{c.name}</p>
                <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                  {c.matched} matched · {c.unmatched} unmatched
                </p>
                {c.gapNote && showUnmatchedOnly && (
                  <p className="mt-1 text-orange-600 dark:text-orange-400">{c.gapNote}</p>
                )}
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
