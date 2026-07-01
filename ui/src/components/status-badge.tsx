import type { ApplicationStatus } from "@/lib/types"

const STATUS_MAP: Record<ApplicationStatus, { label: string; bg: string; fg: string; glow: string }> = {
  applied: {
    label:  "Applied",
    bg:     "rgba(80,200,200,0.12)",
    fg:     "oklch(0.760 0.110 195)",
    glow:   "0 0 8px oklch(0.680 0.130 195 / 0.20)",
  },
  interview: {
    label:  "Interview",
    bg:     "rgba(80,200,120,0.12)",
    fg:     "oklch(0.720 0.130 145)",
    glow:   "0 0 8px oklch(0.620 0.140 145 / 0.20)",
  },
  rejection: {
    label:  "Rejected",
    bg:     "rgba(220,80,60,0.12)",
    fg:     "oklch(0.680 0.170 15)",
    glow:   "0 0 8px oklch(0.620 0.200 15 / 0.16)",
  },
  ghosted: {
    label:  "Ghosted",
    bg:     "rgba(255,255,255,0.06)",
    fg:     "rgba(255,255,255,0.38)",
    glow:   "none",
  },
  manual_pending: {
    label:  "Manual",
    bg:     "rgba(220,160,50,0.12)",
    fg:     "oklch(0.720 0.140 75)",
    glow:   "0 0 8px oklch(0.680 0.130 75 / 0.16)",
  },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_MAP[status] ?? {
    label:  status,
    bg:     "rgba(255,255,255,0.06)",
    fg:     "rgba(255,255,255,0.38)",
    glow:   "none",
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium"
      style={{
        backgroundColor: config.bg,
        color: config.fg,
        border: `1px solid ${config.fg.replace("oklch(", "oklch(").replace(")", " / 0.20)")}`,
        boxShadow: config.glow,
        backdropFilter: "blur(8px)",
      }}
    >
      {config.label}
    </span>
  )
}
