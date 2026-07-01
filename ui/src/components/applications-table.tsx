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
        <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
          <span style={{ fontFamily: "var(--font-mono)", color: "oklch(0.930 0.008 210)" }}>
            {visible.length}
          </span>
          {" "}of{" "}
          <span style={{ fontFamily: "var(--font-mono)", color: "oklch(0.930 0.008 210)" }}>
            {applications.length}
          </span>
          {" "}applications
        </p>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(12px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10)",
          }}
        >
          <FunnelSimple size={13} style={{ color: "rgba(255,255,255,0.35)" }} />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-[12px] font-medium outline-none cursor-pointer"
            style={{
              color: "oklch(0.930 0.008 210)",
              background: "transparent",
            }}
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value} style={{ backgroundColor: "#0d1624", color: "#e0e8f0" }}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
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
        {visible.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Company", "Role", "Platform", "Type", "Status", "Date"].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 font-medium"
                    style={{
                      color: "rgba(255,255,255,0.30)",
                      fontSize: "11px",
                      letterSpacing: "0.06em",
                      background: "rgba(255,255,255,0.02)",
                    }}
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
                    borderBottom: i < visible.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    backgroundColor: hovered === app.id ? "rgba(255,255,255,0.04)" : "transparent",
                    animationDelay: `${i * 30}ms`,
                  }}
                  onMouseEnter={() => setHovered(app.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "oklch(0.900 0.008 210)" }}>
                    {app.company ?? "—"}
                  </td>
                  <td className="px-4 py-3">
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
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {app.ats_platform ?? "—"}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {app.submission_type === "auto" ? "Auto" : app.submission_type === "manual" ? "Manual" : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status as ApplicationStatus} />
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{
                      color: "rgba(255,255,255,0.28)",
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
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
      >
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"
          style={{ color: "rgba(255,255,255,0.30)" }}>
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <p className="text-[13px] font-medium mb-1" style={{ color: "oklch(0.900 0.008 210)" }}>
        {filter === "all" ? "No applications yet" : `No ${filter.replace("_", " ")} applications`}
      </p>
      <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.28)" }}>
        {filter === "all"
          ? "The agent will populate this on its first hourly run."
          : "Try a different filter to see other applications."}
      </p>
    </div>
  )
}
