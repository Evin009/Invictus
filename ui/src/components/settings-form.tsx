"use client"

import { useState } from "react"
import type { Preferences, WatchlistEntry } from "@/lib/types"

interface SettingsFormProps {
  preferences: Preferences | null
  watchlist: WatchlistEntry[]
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-semibold mb-4" style={{ color: "var(--foreground)" }}>
      {children}
    </h2>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-md text-sm outline-none transition-colors"
      style={{
        border: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
      onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
      onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
    />
  )
}

export function SettingsForm({ preferences, watchlist: initial }: SettingsFormProps) {
  const [locations, setLocations] = useState((preferences?.locations ?? []).join(", "))
  const [keywords, setKeywords] = useState((preferences?.role_keywords ?? []).join(", "))
  const [salary, setSalary] = useState(String(preferences?.salary_floor ?? ""))
  const [saving, setSaving] = useState(false)
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle")

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(initial)
  const [newCompany, setNewCompany] = useState("")
  const [newUrl, setNewUrl] = useState("")
  const [adding, setAdding] = useState(false)

  async function savePreferences() {
    setSaving(true)
    setSaveState("idle")
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
          role_keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
          salary_floor: salary ? parseInt(salary, 10) : null,
        }),
      })
      setSaveState(res.ok ? "saved" : "error")
    } catch {
      setSaveState("error")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveState("idle"), 2500)
    }
  }

  async function addWatchlistEntry() {
    if (!newCompany.trim() || !newUrl.trim()) return
    setAdding(true)
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCompany.trim(),
          careers_url: newUrl.trim(),
          role_keywords: [],
        }),
      })
      if (res.ok) {
        const entry = await res.json()
        setWatchlist((prev) => [...prev, entry])
        setNewCompany("")
        setNewUrl("")
      }
    } finally {
      setAdding(false)
    }
  }

  async function removeWatchlistEntry(id: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setWatchlist((prev) => prev.filter((e) => e.id !== id))
  }

  const saveLabel = saving ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Error" : "Save changes"
  const saveColor =
    saveState === "saved"
      ? "oklch(0.290 0.120 145)"
      : saveState === "error"
      ? "oklch(0.350 0.140 15)"
      : "var(--foreground)"

  return (
    <div className="space-y-10 max-w-2xl">
      {/* Preferences section */}
      <section
        className="rounded-lg p-6"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <SectionHeader>Job Preferences</SectionHeader>
        <div className="space-y-4">
          <Field label="Role keywords (comma-separated)">
            <TextInput
              value={keywords}
              onChange={setKeywords}
              placeholder="Software Engineer, Backend Engineer, Full Stack"
            />
          </Field>
          <Field label="Locations (comma-separated)">
            <TextInput
              value={locations}
              onChange={setLocations}
              placeholder="Remote, Tampa FL, New York NY"
            />
          </Field>
          <Field label="Minimum salary (USD/year)">
            <input
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="80000"
              className="w-48 px-3 py-2 rounded-md text-sm outline-none transition-colors"
              style={{
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--foreground)",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-4 py-2 rounded-md text-sm font-medium transition-opacity"
            style={{
              backgroundColor: "var(--foreground)",
              color: "var(--background)",
              opacity: saving ? 0.6 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saveLabel}
          </button>
          {saveState !== "idle" && (
            <span className="text-sm font-medium" style={{ color: saveColor }}>
              {saveState === "saved" ? "Preferences updated" : "Something went wrong"}
            </span>
          )}
        </div>
      </section>

      {/* Watchlist section */}
      <section
        className="rounded-lg p-6"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <SectionHeader>Company Watchlist</SectionHeader>
        <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
          Career pages the agent monitors on each run.
        </p>

        {/* Existing entries */}
        <div
          className="rounded-md overflow-hidden mb-4"
          style={{ border: "1px solid var(--border)" }}
        >
          {watchlist.length === 0 ? (
            <p
              className="px-4 py-6 text-sm text-center"
              style={{ color: "var(--muted-foreground)" }}
            >
              No companies in watchlist. Add one below.
            </p>
          ) : (
            watchlist.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderBottom: i < watchlist.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {entry.company_name ?? "—"}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {entry.careers_url ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => removeWatchlistEntry(entry.id)}
                  className="text-xs px-3 py-1 rounded-md transition-colors font-medium"
                  style={{
                    color: "oklch(0.350 0.140 15)",
                    backgroundColor: "oklch(0.960 0.020 15)",
                  }}
                  onMouseEnter={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor = "oklch(0.940 0.045 15)")
                  }
                  onMouseLeave={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor = "oklch(0.960 0.020 15)")
                  }
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add new entry */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="Company name"
            className="flex-1 px-3 py-2 rounded-md text-sm outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={(e) => e.key === "Enter" && addWatchlistEntry()}
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="https://company.com/careers"
            className="flex-[2] px-3 py-2 rounded-md text-sm outline-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            onKeyDown={(e) => e.key === "Enter" && addWatchlistEntry()}
          />
          <button
            onClick={addWatchlistEntry}
            disabled={adding || !newCompany.trim() || !newUrl.trim()}
            className="px-4 py-2 rounded-md text-sm font-medium transition-opacity whitespace-nowrap"
            style={{
              backgroundColor: "var(--primary)",
              color: "var(--primary-foreground)",
              opacity: adding || !newCompany.trim() || !newUrl.trim() ? 0.5 : 1,
              cursor: adding ? "not-allowed" : "pointer",
            }}
          >
            {adding ? "Adding…" : "Add company"}
          </button>
        </div>
      </section>
    </div>
  )
}
