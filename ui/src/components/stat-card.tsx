interface StatCardProps {
  label: string
  value: number | string
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div
      className="rounded-lg p-5 flex flex-col gap-3"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
    >
      <p className="text-sm font-medium" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </p>
      <div className="flex items-end gap-1.5">
        <span className="text-3xl font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          {value}
        </span>
        {sub && (
          <span className="text-lg font-medium mb-0.5" style={{ color: "var(--muted-foreground)" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  )
}
