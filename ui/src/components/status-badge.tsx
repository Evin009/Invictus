import type { ApplicationStatus } from "@/lib/types"

const STATUS_MAP: Record<
  ApplicationStatus,
  { label: string; bg: string; fg: string }
> = {
  applied: {
    label: "Applied",
    bg: "oklch(0.930 0.040 200)",
    fg: "oklch(0.320 0.100 200)",
  },
  interview: {
    label: "Interview",
    bg: "oklch(0.920 0.060 145)",
    fg: "oklch(0.290 0.120 145)",
  },
  rejection: {
    label: "Rejected",
    bg: "oklch(0.940 0.045 15)",
    fg: "oklch(0.350 0.140 15)",
  },
  ghosted: {
    label: "Ghosted",
    bg: "oklch(0.930 0.000 0)",
    fg: "oklch(0.420 0.000 0)",
  },
  manual_pending: {
    label: "Manual Pending",
    bg: "oklch(0.940 0.065 75)",
    fg: "oklch(0.360 0.130 75)",
  },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = STATUS_MAP[status] ?? {
    label: status,
    bg: "oklch(0.930 0.000 0)",
    fg: "oklch(0.420 0.000 0)",
  }

  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bg, color: config.fg }}
    >
      {config.label}
    </span>
  )
}
