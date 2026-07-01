"use client"

import { useState } from "react"
import { Plus, Trash } from "@phosphor-icons/react"
import type { Preferences, WatchlistEntry } from "@/lib/types"

interface SettingsFormProps {
  preferences: Preferences | null
  watchlist: WatchlistEntry[]
}

function GlassInput({
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
      className={`w-full px-3 py-2 text-[13px] rounded-xl outline-none transition-premium ${className}`}
      style={{
        background: focused ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.045)",
        backdropFilter: "blur(12px)",
        border: `1px solid ${focused ? "oklch(0.680 0.130 195 / 0.50)" : "rgba(255,255,255,0.09)"}`,
        color: "oklch(0.930 0.008 210)",
        boxShadow: focused
          ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 3px oklch(0.680 0.130 195 / 0.12)"
          : "inset 0 1px 0 rgba(255,255,255,0.08)",
      }}
    />
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[12px] font-medium block" style={{ color: "rgba(255,255,255,0.50)" }}>
      {children}
    </label>
  )
}

const glassSection: React.CSSProperties = {
  background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
  backdropFilter: "blur(28px) saturate(150%)",
  WebkitBackdropFilter: "blur(28px) saturate(150%)",
  border: "1px solid rgba(255,255,255,0.09)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.14), 0 8px 32px rgba(0,0,0,0.24)",
  borderRadius: "1rem",
  padding: "24px",
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
    <div className="space-y-6 max-w-2xl animate-fade-up">

      {/* Preferences */}
      <section style={glassSection}>
        <div className="mb-5">
          <h2 className="text-[14px] font-semibold" style={{ color: "oklch(0.930 0.008 210)" }}>
            Job Preferences
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
            Controls what the agent targets on each run.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <FieldLabel>Role keywords</FieldLabel>
            <GlassInput value={keywords} onChange={setKeywords} placeholder="Software Engineer, Backend Engineer, Full Stack" />
            <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.25)" }}>
              Comma-separated. Agent filters job listings by these terms.
            </p>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Locations</FieldLabel>
            <GlassInput value={locations} onChange={setLocations} placeholder="Remote, Tampa FL, New York NY" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Minimum salary (USD/year)</FieldLabel>
            <GlassInput value={salary} onChange={setSalary} placeholder="80000" type="number" className="max-w-[180px]" />
          </div>
        </div>

        <div
          className="flex items-center gap-3 mt-6 pt-5"
          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
        >
          <button
            onClick={savePreferences}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              background: saving
                ? "rgba(255,255,255,0.06)"
                : "linear-gradient(135deg, oklch(0.700 0.130 195), oklch(0.560 0.120 210))",
              color: saving ? "rgba(255,255,255,0.35)" : "white",
              border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              boxShadow: saving ? "none" : "0 2px 12px oklch(0.680 0.130 195 / 0.30), inset 0 1px 0 rgba(255,255,255,0.20)",
            }}
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>

          {saveState === "saved" && (
            <span className="text-[12px] font-medium animate-fade-in" style={{ color: "oklch(0.720 0.130 145)" }}>
              Saved
            </span>
          )}
          {saveState === "error" && (
            <span className="text-[12px] font-medium animate-fade-in" style={{ color: "oklch(0.680 0.170 15)" }}>
              Something went wrong
            </span>
          )}
        </div>
      </section>

      {/* Watchlist */}
      <section style={glassSection}>
        <div className="mb-5">
          <h2 className="text-[14px] font-semibold" style={{ color: "oklch(0.930 0.008 210)" }}>
            Company Watchlist
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>
            Career pages the agent monitors on every hourly run.
          </p>
        </div>

        {watchlist.length === 0 ? (
          <div
            className="rounded-xl px-4 py-8 text-center mb-4"
            style={{ border: "1px dashed rgba(255,255,255,0.10)" }}
          >
            <p className="text-[13px] font-medium" style={{ color: "oklch(0.930 0.008 210)" }}>
              No companies yet
            </p>
            <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.28)" }}>
              Add a company below to start monitoring its career page.
            </p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden mb-4"
            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {watchlist.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between px-4 py-3 transition-premium"
                style={{
                  borderBottom: i < watchlist.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  opacity: removing === entry.id ? 0.4 : 1,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div>
                  <p className="text-[13px] font-medium" style={{ color: "oklch(0.900 0.008 210)" }}>
                    {entry.company_name ?? "—"}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                    {entry.careers_url ?? "—"}
                  </p>
                </div>
                <button
                  onClick={() => removeWatchlistEntry(entry.id)}
                  disabled={removing === entry.id}
                  className="p-2 rounded-lg transition-premium active:scale-[0.92]"
                  style={{ color: "rgba(255,255,255,0.28)", background: "transparent", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "oklch(0.680 0.170 15)"
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "rgba(220,60,40,0.10)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"
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

        <div className="flex gap-2">
          <GlassInput value={newCompany} onChange={setNewCompany} placeholder="Company name" className="flex-1" />
          <GlassInput value={newUrl} onChange={setNewUrl} placeholder="https://company.com/careers" className="flex-[2]" />
          <button
            onClick={addWatchlistEntry}
            disabled={!canAdd}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              background: canAdd
                ? "linear-gradient(135deg, oklch(0.700 0.130 195), oklch(0.560 0.120 210))"
                : "rgba(255,255,255,0.05)",
              color: canAdd ? "white" : "rgba(255,255,255,0.25)",
              border: "none",
              cursor: canAdd ? "pointer" : "not-allowed",
              boxShadow: canAdd ? "0 2px 12px oklch(0.680 0.130 195 / 0.28), inset 0 1px 0 rgba(255,255,255,0.18)" : "none",
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
