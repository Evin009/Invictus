export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import { DiscoveredJobCard } from "@/components/discovered-job-card"
import type { Application, ApplicationStatus, DiscoveredJob } from "@/lib/types"

async function fetchDashboardData() {
  const db = createClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [appsResult, outreachResult, discoveredResult] = await Promise.all([
    db
      .from("applications")
      .select("id,job_url,title,company,ats_platform,status,submission_type,submitted_at")
      .order("submitted_at", { ascending: false }),
    db.from("outreach_log").select("id").gte("sent_at", since24h),
    db
      .from("jobs_seen")
      .select("id,url,title,company,source,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ])

  const apps = (appsResult.data ?? []) as Application[]

  return {
    total:       apps.length,
    interviews:  apps.filter((a) => a.status === "interview").length,
    rejections:  apps.filter((a) => a.status === "rejection").length,
    outreach24h: (outreachResult.data ?? []).length,
    discovered:  (discoveredResult.data ?? []) as DiscoveredJob[],
    recent:      apps.slice(0, 10),
  }
}

export default async function DashboardPage() {
  const data = await fetchDashboardData()

  const responseRate =
    data.total > 0
      ? Math.round(((data.interviews + data.rejections) / data.total) * 100)
      : 0

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between">
        <div>
          <h1 className="text-[1.875rem] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            Dashboard
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            Live overview of your autonomous job search.
          </p>
        </div>

        {/* Agent pill — button-in-button */}
        <div
          className="flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-full text-[11px] font-medium"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
            color: "var(--muted-foreground)",
          }}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-55"
              style={{ backgroundColor: "oklch(0.640 0.120 200)" }} />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: "oklch(0.560 0.115 200)", boxShadow: "0 0 6px oklch(0.560 0.115 200 / 0.55)" }} />
          </span>
          Agent running
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: "var(--muted)", color: "var(--primary)", border: "1px solid var(--border)" }}
          >
            Hourly
          </span>
        </div>
      </div>

      {/* Stats — asymmetric bento */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <StatCard label="Total Applied"  value={data.total}       large accent index={0} />
        <StatCard label="Interviews"     value={data.interviews}        index={1} />
        <StatCard label="Response Rate"  value={responseRate} sub="%" index={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Rejections"          value={data.rejections}   index={3} />
        <StatCard label="Outreach Sent (24h)" value={data.outreach24h}  index={4} />
      </div>

      {/* Discovered jobs — horizontal scroll cards (Tsenta-inspired) */}
      {data.discovered.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: "220ms" }}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
                Top Job Matches
              </h2>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                Recently discovered by the agent
              </p>
            </div>
          </div>
          <div
            className="flex gap-3 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {data.discovered.map((job, i) => (
              <DiscoveredJobCard key={job.id} job={job} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Recent applications table */}
      <div className="animate-fade-up" style={{ animationDelay: "280ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>
            All Applications
          </h2>
          <a href="/applications" className="text-[12px] font-medium transition-premium" style={{ color: "var(--primary)" }}>
            View all →
          </a>
        </div>

        <div className="bezel-shell">
          <div className="bezel-core overflow-hidden">
            {data.recent.length === 0 ? (
              <EmptyApplications />
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                    {["Company", "Role", "Status", "Date"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 font-medium"
                        style={{ color: "var(--muted-foreground)", fontSize: "11px", letterSpacing: "0.05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((app, i) => (
                    <tr
                      key={app.id}
                      className="transition-premium"
                      style={{ borderBottom: i < data.recent.length - 1 ? "1px solid var(--border)" : "none" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "var(--muted)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "transparent")}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <CompanyAvatar name={app.company} />
                          <span className="font-medium" style={{ color: "var(--foreground)" }}>
                            {app.company ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {app.title ? (
                          <a href={app.job_url} target="_blank" rel="noopener noreferrer"
                            className="transition-premium hover:underline" style={{ color: "var(--primary)" }}>
                            {app.title}
                          </a>
                        ) : <span style={{ color: "var(--muted-foreground)" }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={app.status as ApplicationStatus} />
                      </td>
                      <td className="px-4 py-3"
                        style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>
                        {new Date(app.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CompanyAvatar({ name }: { name: string | null }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?"
  const hue = name
    ? (name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 37) % 360
    : 200
  return (
    <div
      className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center text-[9px] font-bold"
      style={{
        background: `oklch(0.88 0.055 ${hue})`,
        color: `oklch(0.30 0.090 ${hue})`,
      }}
    >
      {initials}
    </div>
  )
}

function EmptyApplications() {
  return (
    <div className="px-8 py-16 text-center">
      <div className="w-10 h-10 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "var(--muted-foreground)" }}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      </div>
      <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>No applications yet</p>
      <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        The agent will populate this on its first hourly run.
      </p>
    </div>
  )
}
