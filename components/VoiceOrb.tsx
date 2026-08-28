type OrbState = "idle" | "listening" | "speaking";

export function VoiceOrb({ state = "idle", size = 160 }: { state?: OrbState; size?: number }) {
  return (
    <div className="along-orb-wrap" style={{ width: size, height: size }}>
      <div className={`along-orb-glow along-orb-glow-${state}`} />
      <div className={`along-orb along-orb-${state}`} />
      {state === "listening" && (
        <>
          <span className="along-orb-ring along-orb-ring-1" />
          <span className="along-orb-ring along-orb-ring-2" />
        </>
      )}
    </div>
  );
}
