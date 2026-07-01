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
  const outreach24h = (outreachResult.data ?? []).length
  const replies24h = (repliesResult.data ?? []).length

  return {
    total: apps.length,
    interviews: apps.filter((a) => a.status === "interview").length,
    rejections: apps.filter((a) => a.status === "rejection").length,
    outreach24h,
    replies24h,
    recent: apps.slice(0, 8),
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
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          System activity overview
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applied" value={data.total} />
        <StatCard label="Interviews" value={data.interviews} />
        <StatCard label="Rejections" value={data.rejections} />
        <StatCard label="Response Rate" value={responseRate} sub="%" />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Outreach Sent (24h)" value={data.outreach24h} />
        <StatCard label="Replies Received (24h)" value={data.replies24h} />
      </div>

      {/* Recent applications */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            Recent Applications
          </h2>
          <a
            href="/applications"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--primary)" }}
          >
            View all
          </a>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Company
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Role
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium" style={{ color: "var(--muted-foreground)" }}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((app, i) => (
                <tr
                  key={app.id}
                  style={{
                    borderBottom: i < data.recent.length - 1 ? "1px solid var(--border)" : "none",
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                    {app.company ?? "—"}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {app.title ? (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {app.title}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status as ApplicationStatus} />
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                    {new Date(app.submitted_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
              {data.recent.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    No applications yet. The agent will populate this on its first run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
