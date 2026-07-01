"use client"

import { useState } from "react"
import { Plus, Trash } from "@phosphor-icons/react"
import type { Preferences, WatchlistEntry } from "@/lib/types"

interface SettingsFormProps {
  preferences: Preferences | null
  watchlist: WatchlistEntry[]
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
      {children}
    </h2>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[12px] font-medium block" style={{ color: "var(--foreground)" }}>
      {children}
    </label>
  )
}

function StyledInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  className?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      className={`w-full px-3 py-2 text-[13px] rounded-lg outline-none transition-premium ${className}`}
      style={{
        border: `1px solid ${focused ? "var(--primary)" : "var(--border)"}`,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        boxShadow: focused ? `0 0 0 3px oklch(0.580 0.100 200 / 0.10)` : "none",
      }}
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
  const [removing, setRemoving] = useState<string | null>(null)

  async function savePreferences() {
    setSaving(true)
    setSaveState("idle")
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locations:    locations.split(",").map((s) => s.trim()).filter(Boolean),
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
    if (!newCompany.trim() || !newUrl.trim() || adding) return
    setAdding(true)
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: newCompany.trim(),
          careers_url:  newUrl.trim(),
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
    setRemoving(id)
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setWatchlist((prev) => prev.filter((e) => e.id !== id))
    setRemoving(null)
  }

  const canAdd = newCompany.trim().length > 0 && newUrl.trim().length > 0 && !adding

  return (
    <div className="space-y-8 max-w-2xl animate-fade-up">

      {/* Preferences */}
      <section
        className="rounded-xl p-6"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="mb-5">
          <SectionTitle>Job Preferences</SectionTitle>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Controls what the agent targets on each run.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel>Role keywords</FieldLabel>
            <StyledInput
              value={keywords}
              onChange={setKeywords}
              placeholder="Software Engineer, Backend Engineer, Full Stack"
            />
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Comma-separated. The agent filters job listings by these terms.
            </p>
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Locations</FieldLabel>
            <StyledInput
              value={locations}
              onChange={setLocations}
              placeholder="Remote, Tampa FL, New York NY"
            />
            <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
              Comma-separated. Include "Remote" to match remote positions.
            </p>
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Minimum salary (USD/year)</FieldLabel>
            <StyledInput
              value={salary}
              onChange={setSalary}
              placeholder="80000"
              type="number"
              className="max-w-[180px]"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              backgroundColor: "var(--foreground)",
              color: "var(--background)",
              opacity: saving ? 0.55 : 1,
              cursor: saving ? "not-allowed" : "pointer",
              transform: "translateZ(0)",
            }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>

          {saveState === "saved" && (
            <span className="text-[12px] font-medium animate-fade-in"
              style={{ color: "oklch(0.290 0.120 145)" }}>
              Preferences updated
            </span>
          )}
          {saveState === "error" && (
            <span className="text-[12px] font-medium animate-fade-in"
              style={{ color: "oklch(0.350 0.140 15)" }}>
              Something went wrong
            </span>
          )}
        </div>
      </section>

      {/* Watchlist */}
      <section
        className="rounded-xl p-6"
        style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
      >
        <div className="mb-5">
          <SectionTitle>Company Watchlist</SectionTitle>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Career pages the agent monitors on every hourly run.
          </p>
        </div>

        {/* Entries */}
        {watchlist.length === 0 ? (
          <div
            className="rounded-lg px-4 py-8 text-center mb-4"
            style={{ border: "1px dashed var(--border)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
              No companies yet
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
              Add a company below to start monitoring its career page.
            </p>
          </div>
        ) : (
          <div className="rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
            {watchlist.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 transition-premium"
                style={{
                  borderBottom: i < watchlist.length - 1 ? "1px solid var(--border)" : "none",
                  opacity: removing === entry.id ? 0.4 : 1,
                }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>
                    {entry.company_name ?? "—"}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    {entry.careers_url ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => removeWatchlistEntry(entry.id)}
                  disabled={removing === entry.id}
                  className="p-2 rounded-md transition-premium active:scale-[0.92]"
                  style={{ color: "oklch(0.480 0.005 220)" }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "oklch(0.350 0.140 15)"
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "oklch(0.960 0.020 15)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "oklch(0.480 0.005 220)"
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                  }}
                  aria-label={`Remove ${entry.company_name}`}
                >
                  <Trash size={14} weight="regular" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new */}
        <div className="flex gap-2">
          <StyledInput
            value={newCompany}
            onChange={setNewCompany}
            placeholder="Company name"
            className="flex-1"
          />
          <StyledInput
            value={newUrl}
            onChange={setNewUrl}
            placeholder="https://company.com/careers"
            className="flex-[2]"
          />
          <button
            onClick={addWatchlistEntry}
            disabled={!canAdd}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              backgroundColor: canAdd ? "var(--primary)" : "var(--muted)",
              color: canAdd ? "var(--primary-foreground)" : "var(--muted-foreground)",
              cursor: canAdd ? "pointer" : "not-allowed",
              transform: "translateZ(0)",
            }}
          >
            <Plus size={13} weight="bold" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </section>
    </div>
  )
}
