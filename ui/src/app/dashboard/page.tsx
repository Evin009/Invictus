export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import type { Application, ApplicationStatus } from "@/lib/types"

async function fetchDashboardData() {
  const db = createClient()
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [appsResult, outreachResult, repliesResult] = await Promise.all([
    db
      .from("applications")
      .select("id,job_url,title,company,ats_platform,status,submission_type,submitted_at")
      .order("submitted_at", { ascending: false }),
    db.from("outreach_log").select("id").gte("sent_at", since24h),
    db.from("reply_log").select("id,classification").gte("received_at", since24h),
  ])

  const apps = (appsResult.data ?? []) as Application[]

  return {
    total:       apps.length,
    interviews:  apps.filter((a) => a.status === "interview").length,
    rejections:  apps.filter((a) => a.status === "rejection").length,
    outreach24h: (outreachResult.data ?? []).length,
    replies24h:  (repliesResult.data ?? []).length,
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
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up flex items-start justify-between">
        <div>
          <h1
            className="text-[1.625rem] font-semibold tracking-tight"
            style={{ color: "oklch(0.930 0.008 210)" }}
          >
            Dashboard
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
            Live overview of your autonomous job search.
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: "oklch(0.720 0.130 195)", boxShadow: "0 0 6px oklch(0.720 0.130 195 / 0.60)" }}
          />
          Agent running
        </div>
      </div>

      {/* Asymmetric stat grid */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <StatCard label="Total Applied"   value={data.total}       large index={0} accent />
        <StatCard label="Interviews"      value={data.interviews}        index={1} />
        <StatCard label="Response Rate"   value={responseRate} sub="%" index={2} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Rejections"          value={data.rejections}   index={3} />
        <StatCard label="Outreach Sent (24h)" value={data.outreach24h}  index={4} />
      </div>

      {/* Recent applications */}
      <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold" style={{ color: "oklch(0.930 0.008 210)" }}>
            Recent Applications
          </h2>
          <a
            href="/applications"
            className="text-[12px] font-medium transition-premium"
            style={{ color: "oklch(0.720 0.130 195)" }}
          >
            View all →
          </a>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.03) 100%)",
            backdropFilter: "blur(28px) saturate(150%)",
            WebkitBackdropFilter: "blur(28px) saturate(150%)",
            border: "1px solid rgba(255,255,255,0.09)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 32px rgba(0,0,0,0.24)",
          }}
        >
          {data.recent.length === 0 ? (
            <EmptyApplications />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Company", "Role", "Status", "Date"].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium"
                      style={{ color: "rgba(255,255,255,0.28)", fontSize: "11px", letterSpacing: "0.06em" }}
                    >
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
                    style={{
                      borderBottom: i < data.recent.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.900 0.008 210)" }}>
                      {app.company ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {app.title ? (
                        <a
                          href={app.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition-premium hover:underline"
                          style={{ color: "oklch(0.720 0.130 195)" }}
                        >
                          {app.title}
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status as ApplicationStatus} />
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{
                        color: "rgba(255,255,255,0.28)",
                        fontFamily: "var(--font-mono, monospace)",
                        fontSize: "12px",
                      }}
                    >
                      {new Date(app.submitted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyApplications() {
  return (
    <div className="px-8 py-16 text-center">
      <div
        className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "rgba(255,255,255,0.30)" }}>
          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
        </svg>
      </div>
      <p className="text-[13px] font-medium mb-1" style={{ color: "oklch(0.930 0.008 210)" }}>
        No applications yet
      </p>
      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.28)" }}>
        The agent will populate this on its first hourly run.
      </p>
    </div>
  )
}
