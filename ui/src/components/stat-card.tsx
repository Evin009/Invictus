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
    /* Outer shell — double-bezel */
    <div
      className="animate-fade-up rounded-2xl p-[3px]"
      style={{
        background: accent
          ? "linear-gradient(135deg, oklch(0.580 0.100 200 / 0.25), oklch(0.910 0.003 220))"
          : "oklch(0.910 0.003 220 / 0.6)",
        animationDelay: `${index * 55}ms`,
      }}
    >
      {/* Inner core */}
      <div
        className="rounded-[calc(1rem-3px)] p-5 flex flex-col justify-between h-full"
        style={{
          background: accent
            ? "linear-gradient(145deg, oklch(0.995 0.003 200), oklch(1.000 0.000 0))"
            : "oklch(1.000 0.000 0)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
          minHeight: large ? "138px" : "108px",
        }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--muted-foreground)" }}
        >
          {label}
        </p>
        <div className="flex items-end gap-1 mt-auto">
          <span
            className={`font-semibold tracking-tight leading-none ${large ? "text-[3.25rem]" : "text-[2rem]"}`}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              color: accent ? "oklch(0.480 0.090 200)" : "var(--foreground)",
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
                color: "var(--muted-foreground)",
              }}
            >
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
