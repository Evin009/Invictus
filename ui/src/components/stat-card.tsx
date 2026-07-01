interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  large?: boolean
  index?: number
}

export function StatCard({ label, value, sub, large = false, index = 0 }: StatCardProps) {
  return (
    <div
      className="animate-fade-up rounded-xl p-5 flex flex-col justify-between gap-4"
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--card)",
        animationDelay: `${index * 60}ms`,
        minHeight: large ? "140px" : "auto",
      }}
    >
      <p
        className="text-[12px] font-medium uppercase tracking-wider"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
      <div className="flex items-end gap-1">
        <span
          className={`font-semibold tracking-tight leading-none ${large ? "text-5xl" : "text-[2rem]"}`}
          style={{
            fontFamily: "var(--font-mono, monospace)",
            color: "var(--foreground)",
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="text-xl font-medium mb-0.5"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              color: "var(--muted-foreground)",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
