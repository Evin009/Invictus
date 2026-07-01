"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import type { Application, ApplicationStatus } from "@/lib/types"
import { FunnelSimple } from "@phosphor-icons/react"

const STATUS_FILTERS = [
  { value: "all",            label: "All statuses" },
  { value: "applied",        label: "Applied" },
  { value: "interview",      label: "Interview" },
  { value: "rejection",      label: "Rejected" },
  { value: "ghosted",        label: "Ghosted" },
  { value: "manual_pending", label: "Manual Pending" },
]

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [filter, setFilter] = useState("all")
  const [hovered, setHovered] = useState<string | null>(null)

  const visible =
    filter === "all" ? applications : applications.filter((a) => a.status === filter)

  return (
    <div className="space-y-4 animate-fade-up">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-medium" style={{ color: "var(--muted-foreground)" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
            {visible.length}
          </span>
          {" "}of{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--foreground)" }}>
            {applications.length}
          </span>
          {" "}applications
        </p>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-premium"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--card)",
          }}
        >
          <FunnelSimple size={13} style={{ color: "var(--muted-foreground)" }} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[12px] font-medium outline-none cursor-pointer bg-transparent"
            style={{ color: "var(--foreground)" }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--muted)",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                {["Company", "Role", "Platform", "Type", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium"
                    style={{ color: "var(--muted-foreground)" }}
                  >
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
                    animationDelay: `${i * 30}ms`,
                  }}
                  onMouseEnter={() => setHovered(app.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                    {app.company ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {app.title ? (
                      <a
                        href={app.job_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="transition-premium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {app.title}
                      </a>
                    ) : (
                      <span style={{ color: "var(--muted-foreground)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--muted-foreground)" }}>
                    {app.ats_platform ?? "—"}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "var(--muted-foreground)" }}>
                    {app.submission_type === "auto" ? "Auto" : app.submission_type === "manual" ? "Manual" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status as ApplicationStatus} />
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      color: "var(--muted-foreground)",
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: "11px",
                    }}
                  >
                    {new Date(app.submitted_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function EmptyState({ filter }: { filter: string }) {
  return (
    <div className="py-16 text-center">
      <div
        className="w-10 h-10 rounded-full mx-auto mb-4 flex items-center justify-center"
        style={{ backgroundColor: "var(--muted)" }}
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "var(--muted-foreground)" }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <p className="text-[13px] font-medium mb-1" style={{ color: "var(--foreground)" }}>
        {filter === "all" ? "No applications yet" : `No ${filter.replace("_", " ")} applications`}
      </p>
      <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
        {filter === "all"
          ? "The agent will populate this on its first hourly run."
          : "Try a different filter to see other applications."}
      </p>
    </div>
  )
}
