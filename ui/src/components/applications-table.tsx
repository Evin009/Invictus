"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import type { Application, ApplicationStatus } from "@/lib/types"

const TABS = [
  { value: "all",            label: "All" },
  { value: "applied",        label: "Applied" },
  { value: "interview",      label: "Interview" },
  { value: "rejection",      label: "Rejected" },
  { value: "ghosted",        label: "Ghosted" },
  { value: "manual_pending", label: "Pending" },
]

function CompanyAvatar({ name }: { name: string | null }) {
  const initials = name ? name.slice(0, 2).toUpperCase() : "?"
  const hue = name
    ? (name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) * 37) % 360
    : 200
  return (
    <div
      className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[10px] font-bold"
      style={{
        background: `oklch(0.88 0.055 ${hue})`,
        color: `oklch(0.30 0.090 ${hue})`,
      }}
    >
      {initials}
    </div>
  )
}

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [filter, setFilter] = useState("all")
  const [hovered, setHovered] = useState<string | null>(null)

  const visible =
    filter === "all" ? applications : applications.filter((a) => a.status === filter)

  return (
    <div className="space-y-4 animate-fade-up">

      {/* Tab bar */}
      <div className="flex items-center justify-between">
        <div
          className="flex items-center gap-0.5 p-1 rounded-xl"
          style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}
        >
          {TABS.map((tab) => {
            const active = filter === tab.value
            const count = tab.value === "all"
              ? applications.length
              : applications.filter((a) => a.status === tab.value).length

            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-premium"
                style={{
                  backgroundColor: active ? "var(--card)" : "transparent",
                  color: active ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{
                      backgroundColor: active ? "var(--muted)" : "transparent",
                      color: active ? "var(--primary)" : "var(--muted-foreground)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[12px]" style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono, monospace)" }}>
          {visible.length} / {applications.length}
        </p>
      </div>

      {/* Table in bezel */}
      <div className="bezel-shell">
        <div className="bezel-core overflow-hidden">
          {visible.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
                  {["Company", "Role", "Platform", "Type", "Status", "Date"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium"
                      style={{ color: "var(--muted-foreground)", fontSize: "11px", letterSpacing: "0.05em" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((app, i) => (
                  <tr
                    key={app.id}
                    className="transition-premium"
                    style={{
                      borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
                      backgroundColor: hovered === app.id ? "var(--muted)" : "transparent",
                      animationDelay: `${i * 25}ms`,
                    }}
                    onMouseEnter={() => setHovered(app.id)}
                    onMouseLeave={() => setHovered(null)}
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
                    <td className="px-4 py-3 capitalize" style={{ color: "var(--muted-foreground)" }}>
                      {app.ats_platform ?? "—"}
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                      {app.submission_type === "auto" ? "Auto" : app.submission_type === "manual" ? "Manual" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={app.status as ApplicationStatus} />
                    </td>
                    <td className="px-4 py-3"
                      style={{ color: "var(--muted-foreground)", fontFamily: "var(--font-mono, monospace)", fontSize: "11px" }}>
                      {new Date(app.submitted_at).toLocaleDateString("en-US", {
                        month: "short", day: "numeric", year: "numeric",
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

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: "var(--muted)" }}>
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "var(--muted-foreground)" }}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <p className="text-[13px] font-medium mb-1" style={{ color: "var(--foreground)" }}>
        {filter === "all" ? "No applications yet" : `No ${filter.replace("_", " ")} applications`}
      </p>
      <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        {filter === "all"
          ? "The agent will populate this on its first hourly run."
          : "Try a different tab to see other applications."}
      </p>
    </div>
  )
}
