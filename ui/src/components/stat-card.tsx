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
    /* Outer bezel shell */
    <div
      className="animate-fade-up bezel-shell"
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {/* Inner core */}
      <div
        className="bezel-core p-5 flex flex-col justify-between"
        style={{ minHeight: large ? "144px" : "112px" }}
      >
        <div className="flex items-center justify-between">
          <p
            className="text-[10px] font-semibold uppercase"
            style={{
              color: accent ? "var(--primary)" : "var(--muted-foreground)",
              letterSpacing: "0.12em",
            }}
          >
            {label}
          </p>
          {accent && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: "var(--primary)",
                boxShadow: "0 0 8px oklch(0.560 0.115 200 / 0.50)",
              }}
            />
          )}
        </div>

        <div className="flex items-end gap-0.5 mt-auto pt-3">
          <span
            className={`font-semibold tracking-tight leading-none ${large ? "text-[3.5rem]" : "text-[2.125rem]"}`}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              color: accent ? "var(--primary)" : "var(--foreground)",
              textShadow: accent ? "0 0 32px oklch(0.560 0.115 200 / 0.15)" : "none",
            }}
          >
            {value}
          </span>
          {sub && (
            <span
              className="font-medium pb-1"
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: large ? "1.375rem" : "1.05rem",
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
