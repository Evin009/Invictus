interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  large?: boolean
  index?: number
  accent?: boolean
}

export function StatCard({ label, value, sub, large = false, index = 0, accent = false }: StatCardProps) {
  return (
    <div
      className="animate-fade-up rounded-2xl flex flex-col justify-between"
      style={{
        /* Liquid glass card */
        background: accent
          ? "linear-gradient(145deg, rgba(100,200,220,0.10) 0%, rgba(255,255,255,0.04) 100%)"
          : "linear-gradient(145deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)",
        backdropFilter: "blur(28px) saturate(150%)",
        WebkitBackdropFilter: "blur(28px) saturate(150%)",
        border: accent
          ? "1px solid oklch(0.680 0.130 195 / 0.22)"
          : "1px solid rgba(255,255,255,0.10)",
        boxShadow: accent
          ? "inset 0 1px 0 rgba(180,230,240,0.22), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.28), 0 0 24px oklch(0.680 0.130 195 / 0.06)"
          : "inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.03), 0 8px 32px rgba(0,0,0,0.28)",
        padding: "20px",
        minHeight: large ? "138px" : "108px",
        animationDelay: `${index * 55}ms`,
      }}
    >
      <p
        className="text-[10px] font-semibold uppercase"
        style={{
          color: accent ? "oklch(0.680 0.130 195)" : "rgba(255,255,255,0.36)",
          letterSpacing: "0.13em",
        }}
      >
        {label}
      </p>
      <div className="flex items-end gap-1 mt-auto">
        <span
          className={`font-semibold tracking-tight leading-none ${large ? "text-[3.25rem]" : "text-[2rem]"}`}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            color: accent ? "oklch(0.820 0.120 195)" : "oklch(0.930 0.008 210)",
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="font-medium mb-1"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: large ? "1.25rem" : "1rem",
              color: "rgba(255,255,255,0.35)",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
