"use client"

import { useEffect, useState } from "react"
import type { Application, ApplicationStatus } from "@/lib/types"
import { StatCard } from "@/components/stat-card"
import { JobCard, JOB_CARD_CSS, type JobCardJob } from "@/components/job-card"
import { JOB_FILTER_KEYS, buildJobFilterOptions, jobMatchesFilters } from "@/lib/job-filter"

interface DashboardStats {
  jobs_discovered: number
  applied: number
  outreach_sent: number
  interviews: number
}

const TOP_JOBS_COUNT = 10
const ACTIVE_WINDOW_MS = 7 * 24 * 3600 * 1000
const TOP_JOBS_REFRESH_MS = 5 * 3600 * 1000

// ─── Types ────────────────────────────────────────────────────────────────────
type StatusTab = { label: string; filter: ApplicationStatus | "all" }

const STATUS_TABS: StatusTab[] = [
  { label: "All",       filter: "all" },
  { label: "Applied",   filter: "applied" },
  { label: "Interview", filter: "interview" },
  { label: "Pending",   filter: "manual_pending" },
  { label: "Rejected",  filter: "rejection" },
  { label: "Ghosted",   filter: "ghosted" },
]


const SHIMMER_CSS = `
  @keyframes dash-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .dash-shimmer { background: linear-gradient(90deg, #EDF2F0 25%, #F6F9F8 37%, #EDF2F0 63%); background-size: 400% 100%; animation: dash-shimmer 1.4s ease infinite; border-radius: 6px; }
  input::placeholder { color: rgba(0,49,53,0.4); }
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-thumb { background: rgba(0,49,53,0.14); border-radius: 8px; }
  .pill-filter:hover { opacity: 0.85; }
  .app-row:hover { background: rgba(0,49,53,0.02); }
  .dash-btn:hover { opacity: 0.85; }
  ${JOB_CARD_CSS}
`

function statusColor(status: ApplicationStatus) {
  if (status === "applied")        return "#0FA4AF"
  if (status === "interview")      return "#4FD1B5"
  if (status === "manual_pending") return "#D9B25C"
  if (status === "rejection")      return "#E39C88"
  return "rgba(0,49,53,0.4)"
}

function statusLabel(status: ApplicationStatus) {
  if (status === "applied")        return "Applied"
  if (status === "interview")      return "Interview"
  if (status === "manual_pending") return "Pending"
  if (status === "rejection")      return "Rejected"
  if (status === "ghosted")        return "Ghosted"
  return status
}

function getInitials(company: string | null) {
  if (!company) return "—"
  return company.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase()
}

const AVATAR_COLORS = ["#F6D9CF", "#CDEFF2", "#D8EFE1", "#E4D9F2", "#D9EEF6", "#F2E4D9"]
function avatarColor(company: string | null) {
  const n = (company ?? "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[n % AVATAR_COLORS.length]
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [apps, setApps]         = useState<Application[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab["filter"]>("all")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [lastRunAt, setLastRunAt] = useState<string | null>(null)
  // Full active-window (7-day) job pool, sorted most-recent-first — the
  // "Top 10" strip is a filtered/sliced view of this, not a separate fetch.
  const [activeJobs, setActiveJobs] = useState<JobCardJob[]>([])
  const [jobFilterValues, setJobFilterValues] = useState<Record<string, string>>({})
  const [jobOpenFilter, setJobOpenFilter] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/run-log")
      .then(r => r.json())
      .then(d => { setStats(d?.stats ?? null); setLastRunAt(d?.lastRunAt ?? null) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Every job discovered in the last 7 days, across every agent. Polled
    // every 5h so a page left open picks up new postings without a manual
    // reload. The Top 10 strip filters/slices this client-side.
    function loadActiveJobs() {
      const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS).toISOString()
      fetch("/api/jobs")
        .then(r => r.json())
        .then((jobs: JobCardJob[]) => {
          if (!Array.isArray(jobs)) return
          const active = jobs
            .filter(j => j.discovered_at && j.discovered_at >= activeSince)
            .sort((a, b) => new Date(b.discovered_at ?? 0).getTime() - new Date(a.discovered_at ?? 0).getTime())
          setActiveJobs(active)
        })
        .catch(() => {})
    }
    loadActiveJobs()
    const interval = setInterval(loadActiveJobs, TOP_JOBS_REFRESH_MS)
    return () => clearInterval(interval)
  }, [])

  // Close job-filter dropdown on outside click
  useEffect(() => {
    if (!jobOpenFilter) return
    function handler(e: MouseEvent) {
      if (!(e.target as Element).closest("[data-job-filter-pill]")) setJobOpenFilter(null)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [jobOpenFilter])

  useEffect(() => {
    fetch("/api/applications")
      .then(r => r.json())
      .then(data => { setApps(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  // "All" means companies actually applied to — manual_pending items are
  // still awaiting your review/action, not real applications, and get their
  // own "Pending" tab instead.
  const filtered = apps.filter(a =>
    activeTab === "all" ? a.status !== "manual_pending" : a.status === activeTab
  )

  const countFor = (f: StatusTab["filter"]) =>
    f === "all" ? apps.filter(a => a.status !== "manual_pending").length : apps.filter(a => a.status === f).length

  const jobFilterOptions = buildJobFilterOptions(activeJobs)
  const filteredActiveJobs = activeJobs.filter(j => jobMatchesFilters(j, jobFilterValues))
  const topJobs = filteredActiveJobs.slice(0, TOP_JOBS_COUNT)

  // ─── Render ─────────────────────────────────────────────────────────────────
  // This page is a flex:1 child of a fixed-height (100vh, overflow:hidden)
  // layout. Everything below scrolls internally as one unit — without this,
  // the Applications table (flex:1, minHeight:0) silently gets squeezed
  // toward zero height whenever the sections above it (stats, filters, Top
  // jobs) grow taller than the viewport, making it look "hidden".
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1, minHeight: 0, overflowY: "auto" }}>
      <style dangerouslySetInnerHTML={{ __html: SHIMMER_CSS }} />

      {/* ── Stats (today, resets midnight ET) ── */}
      {stats && (
        <div style={{ flexShrink: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
            <StatCard label="Jobs found today" value={stats.jobs_discovered} index={0} />
            <StatCard label="Applied today" value={stats.applied} index={1} accent />
            <StatCard label="Interviews today" value={stats.interviews} index={2} />
            <StatCard label="Outreach sent today" value={stats.outreach_sent} index={3} />
          </div>
          <p style={{ fontSize: 11, color: "rgba(0,49,53,0.4)", margin: "8px 2px 0" }}>
            Resets at midnight ET{lastRunAt ? ` — last run ${timeAgo(lastRunAt)}` : ""}
          </p>
        </div>
      )}

      {/* ── Top 10 recent active jobs (all agents, refreshes every 5h) ── */}
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: "18px 20px", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Top 10 jobs</h2>
          <span style={{ fontSize: 11, color: "rgba(0,49,53,0.4)" }}>Refreshes every 5h · rest on Browse jobs</span>
        </div>

        {/* Job filter bar */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", marginBottom: 14 }}>
          {JOB_FILTER_KEYS.map(key => {
            const selected = jobFilterValues[key]
            const active = !!selected
            const isOpen = jobOpenFilter === key
            const options = jobFilterOptions[key] ?? []
            return (
              <div key={key} style={{ position: "relative" }} data-job-filter-pill>
                <div
                  className="pill-filter"
                  onClick={() => setJobOpenFilter(p => p === key ? null : key)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    borderRadius: 20, padding: "9px 16px", cursor: "pointer",
                    background: active ? "#024950" : "#F5F8F7",
                    color: active ? "#fff" : "#003135",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{selected ? `${key}: ${selected}` : key}</span>
                  {active
                    ? <span onClick={e => { e.stopPropagation(); setJobFilterValues(p => { const n = { ...p }; delete n[key]; return n }) }} style={{ cursor: "pointer", opacity: 0.7 }}>×</span>
                    : <span style={{ opacity: 0.4, fontSize: 11 }}>▾</span>
                  }
                </div>

                {isOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 190, background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,49,53,0.14)", padding: 6, zIndex: 50, display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
                    {options.length === 0 ? (
                      <div style={{ padding: "10px 14px", fontSize: 12.5, color: "rgba(0,49,53,0.4)" }}>No options yet</div>
                    ) : options.map(opt => (
                      <div
                        key={opt}
                        onClick={() => { setJobFilterValues(p => ({ ...p, [key]: opt })); setJobOpenFilter(null) }}
                        style={{ padding: "10px 14px", fontSize: 13, fontWeight: opt === selected ? 700 : 500, cursor: "pointer", color: opt === selected ? "#964734" : "#003135", background: opt === selected ? "rgba(150,71,52,0.08)" : "transparent", borderRadius: 8 }}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {topJobs.length > 0 ? (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
            {topJobs.map(j => (
              <div key={j.id} style={{ flexShrink: 0, width: 230 }}>
                <JobCard
                  job={j}
                  onSelect={() => window.open(j.url, "_blank", "noopener,noreferrer")}
                  onPass={e => { e.stopPropagation(); setActiveJobs(prev => prev.filter(x => x.id !== j.id)) }}
                  onApply={e => { e.stopPropagation(); window.open(j.url, "_blank", "noopener,noreferrer") }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: "linear-gradient(135deg, rgba(15,164,175,0.08), rgba(150,71,52,0.06))", borderRadius: 18, padding: "36px 24px", textAlign: "center" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", color: "#024950", fontSize: 17 }}>◎</div>
            <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No picks today</p>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.55)" }}>The agent didn't surface anything new — broaden your filters or check back later.</p>
          </div>
        )}
      </div>

      {/* ── Applications section ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>All applications</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="dash-btn" style={{ background: "#fff", border: "none", color: "#003135", borderRadius: 20, padding: "10px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 3px rgba(0,49,53,0.08)" }}>
            Open tracker
          </button>
          <button className="dash-btn" style={{ background: "#964734", border: "none", color: "#fff", borderRadius: 20, padding: "10px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Approve all
          </button>
        </div>
      </div>

      {/* ── Applications table card ── */}
      <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", overflow: "hidden", flexShrink: 0, minHeight: 420, display: "flex", flexDirection: "column" }}>

        {/* Table header row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderBottom: "1px solid rgba(0,49,53,0.07)", flexWrap: "wrap", flexShrink: 0 }}>
          {/* Status tabs */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {STATUS_TABS.map(tab => {
              const active = activeTab === tab.filter
              const count = countFor(tab.filter)
              return (
                <div
                  key={tab.filter}
                  onClick={() => setActiveTab(tab.filter)}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 18, cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? "#964734" : "#F5F8F7", color: active ? "#fff" : "rgba(0,49,53,0.6)" }}
                >
                  <span>{tab.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 8, background: active ? "rgba(255,255,255,0.25)" : "rgba(0,49,53,0.08)" }}>{count}</span>
                </div>
              )
            })}
          </div>

        </div>

        {/* Column headers */}
        <div style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr", gap: 12, padding: "12px 20px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(0,49,53,0.4)", flexShrink: 0 }}>
          <span>COMPANY</span>
          <span>RESUME</span>
          <span>COVER LETTER</span>
          <span>STATUS</span>
          <span>APPLIED</span>
        </div>

        {/* Scrollable rows */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
          {loading ? (
            // Skeleton rows
            [0,1,2,3].map(i => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "16px 20px", borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div className="dash-shimmer" style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="dash-shimmer" style={{ height: 13, width: "60%", marginBottom: 8 }} />
                    <div className="dash-shimmer" style={{ height: 11, width: "40%" }} />
                  </div>
                </div>
                <div className="dash-shimmer" style={{ height: 11, width: 70 }} />
                <div className="dash-shimmer" style={{ height: 11, width: 70 }} />
                <div className="dash-shimmer" style={{ height: 11, width: 60 }} />
                <div className="dash-shimmer" style={{ height: 11, width: 50 }} />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "60px 24px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F5F8F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#024950", fontSize: 19 }}>◎</div>
              <p style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700 }}>No applications here</p>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(0,49,53,0.5)", maxWidth: 320 }}>
                Nothing matches {activeTab !== "all" ? `"${STATUS_TABS.find(t => t.filter === activeTab)?.label}"` : "your filters"} right now.
              </p>
              {activeTab !== "all" && (
                <button onClick={() => setActiveTab("all")} style={{ background: "#F5F8F7", border: "none", color: "#003135", borderRadius: 20, padding: "10px 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Show all applications
                </button>
              )}
            </div>
          ) : (
            filtered.map(app => (
              <div key={app.id} className="app-row" style={{ display: "grid", gridTemplateColumns: "2.4fr 1fr 1fr 1fr 1fr", gap: 12, alignItems: "center", padding: "16px 20px", borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                {/* Company */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: avatarColor(app.company), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0, color: "#003135" }}>
                    {getInitials(app.company)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.company ?? "—"}</p>
                    <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{app.title ?? "—"}</p>
                  </div>
                </div>
                {/* Resume */}
                <span style={{ fontSize: 13, fontWeight: 600, color: app.resume_pdf_path ? "#0FA4AF" : "rgba(0,49,53,0.4)" }}>
                  ● {app.resume_pdf_path ? "Ready" : "—"}
                </span>
                {/* Cover letter */}
                <span style={{ fontSize: 13, fontWeight: 600, color: app.cover_letter_path ? "#0FA4AF" : "rgba(0,49,53,0.4)" }}>
                  ● {app.cover_letter_path ? "Ready" : "—"}
                </span>
                {/* Status */}
                <span style={{ fontSize: 13, fontWeight: 600, color: statusColor(app.status) }}>
                  ● {statusLabel(app.status)}
                </span>
                {/* Applied */}
                <span style={{ fontSize: 13, color: "rgba(0,49,53,0.45)" }}>{timeAgo(app.submitted_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
