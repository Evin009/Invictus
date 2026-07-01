"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import type { Application, ApplicationStatus } from "@/lib/types"

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "rejection", label: "Rejected" },
  { value: "ghosted", label: "Ghosted" },
  { value: "manual_pending", label: "Manual Pending" },
]

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [filter, setFilter] = useState("all")

  const visible =
    filter === "all" ? applications : applications.filter((a) => a.status === filter)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
          {visible.length} of {applications.length} applications
        </p>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-md outline-none cursor-pointer transition-colors"
          style={{
            border: "1px solid var(--border)",
            backgroundColor: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
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
                className="transition-colors"
                style={{
                  borderBottom: i < visible.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "var(--muted)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <td className="px-4 py-3 font-medium" style={{ color: "var(--foreground)" }}>
                  {app.company ?? "—"}
                </td>
                <td className="px-4 py-3" style={{ color: "var(--foreground)" }}>
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
                    <span style={{ color: "var(--muted-foreground)" }}>—</span>
                  )}
                </td>
                <td
                  className="px-4 py-3 capitalize"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {app.ats_platform ?? "—"}
                </td>
                <td
                  className="px-4 py-3 capitalize"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {app.submission_type === "auto"
                    ? "Auto"
                    : app.submission_type === "manual"
                    ? "Manual"
                    : "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status as ApplicationStatus} />
                </td>
                <td className="px-4 py-3" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(app.submitted_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {filter === "all"
                    ? "No applications yet."
                    : `No applications with status "${filter}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
