import type { DiscoveredJob } from "@/lib/types"

const SOURCE_STYLES: Record<string, { bg: string; badge: string; badgeFg: string }> = {
  search:    { bg: "oklch(0.94 0.055 200)", badge: "oklch(0.820 0.100 200)", badgeFg: "oklch(0.290 0.100 200)" },
  watchlist: { bg: "oklch(0.94 0.050 265)", badge: "oklch(0.820 0.090 265)", badgeFg: "oklch(0.290 0.090 265)" },
  crawler:   { bg: "oklch(0.95 0.060 70)",  badge: "oklch(0.840 0.100 70)",  badgeFg: "oklch(0.300 0.100 70)"  },
}

const FALLBACK = { bg: "oklch(0.940 0.005 220)", badge: "oklch(0.880 0.008 220)", badgeFg: "oklch(0.380 0.010 225)" }

interface Props {
  job: DiscoveredJob
  index?: number
}

export function DiscoveredJobCard({ job, index = 0 }: Props) {
  const style = SOURCE_STYLES[job.source ?? ""] ?? FALLBACK
  const sourceLabel = job.source ? job.source.charAt(0).toUpperCase() + job.source.slice(1) : "Discovery"

  return (
    <a
      href={job.url}
      target="_blank"
      rel="noopener noreferrer"
      className="animate-fade-up flex-none group"
      style={{
        animationDelay: `${index * 60}ms`,
        textDecoration: "none",
        display: "block",
        width: "220px",
      }}
    >
      <div
        className="rounded-2xl p-4 h-full flex flex-col justify-between gap-6 transition-premium"
        style={{
          backgroundColor: style.bg,
          minHeight: "140px",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(-2px)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")}
      >
        {/* Top: company avatar + source */}
        <div className="flex items-start justify-between">
          <CompanyInitials name={job.company} />
          <span
            className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: style.badge,
              color: style.badgeFg,
              letterSpacing: "0.10em",
            }}
          >
            {sourceLabel}
          </span>
        </div>

        {/* Bottom: role info */}
        <div>
          <p className="text-[13px] font-semibold leading-snug mb-1" style={{ color: "oklch(0.12 0.010 228)" }}>
            {job.title ?? "Role TBD"}
          </p>
          <p className="text-[11px] font-medium" style={{ color: "oklch(0.38 0.010 228)" }}>
            {job.company ?? "Company"}
          </p>
        </div>
      </div>
    </a>
  )
}

function CompanyInitials({ name }: { name: string | null }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?"
  const hue = name
    ? (name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 37) % 360
    : 200

  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center text-[13px] font-bold shrink-0"
      style={{
        background: `oklch(1.000 0.000 0 / 0.70)`,
        color: `oklch(0.28 0.080 ${hue})`,
        backdropFilter: "blur(4px)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.90)",
      }}
    >
      {initials}
    </div>
  )
}
