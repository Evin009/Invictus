"use client"

import { useState } from "react"
import { Plus, Trash } from "@phosphor-icons/react"
import type { Seed } from "@/lib/types"

interface SeedSettingsFormProps {
  coverLetterSeeds: Seed[]
  outreachSeeds: Seed[]
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[13px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
      {children}
    </h2>
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

// Cover letter / outreach tone samples. Job preferences and the company
// watchlist live on the Profile page (JobPreferencesCard / CompanyWatchlistCard)
// — not duplicated here.
export function SettingsForm({ coverLetterSeeds: initialCL, outreachSeeds: initialOutreach }: SeedSettingsFormProps) {
  const [clSeeds, setClSeeds] = useState<Seed[]>(initialCL)
  const [outreachSeeds, setOutreachSeeds] = useState<Seed[]>(initialOutreach)
  const [newClLabel, setNewClLabel] = useState("")
  const [newClContent, setNewClContent] = useState("")
  const [newClMode, setNewClMode] = useState<"reuse" | "tone_only">("tone_only")
  const [newOrLabel, setNewOrLabel] = useState("")
  const [newOrContent, setNewOrContent] = useState("")
  const [addingSeed, setAddingSeed] = useState<string | null>(null)
  const [removingSeed, setRemovingSeed] = useState<string | null>(null)

  async function addSeed(table: "cover_letter_seeds" | "outreach_seeds", label: string, content: string, mode?: "reuse" | "tone_only") {
    if (!label.trim() || !content.trim()) return
    setAddingSeed(table)
    try {
      const res = await fetch("/api/seeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table, label: label.trim(), content: content.trim(), ...(mode ? { mode } : {}) }),
      })
      if (res.ok) {
        const entry = await res.json() as Seed
        if (table === "cover_letter_seeds") {
          setClSeeds((p) => [...p, entry])
          setNewClLabel(""); setNewClContent(""); setNewClMode("tone_only")
        } else {
          setOutreachSeeds((p) => [...p, entry])
          setNewOrLabel(""); setNewOrContent("")
        }
      }
    } finally { setAddingSeed(null) }
  }

  async function removeSeed(table: "cover_letter_seeds" | "outreach_seeds", id: string) {
    setRemovingSeed(id)
    await fetch("/api/seeds", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id }),
    })
    if (table === "cover_letter_seeds") setClSeeds((p) => p.filter((e) => e.id !== id))
    else setOutreachSeeds((p) => p.filter((e) => e.id !== id))
    setRemovingSeed(null)
  }

  return (
    <div className="space-y-8 animate-fade-up">

      {/* Cover Letter Seeds */}
      <SeedSection
        title="Cover Letter Samples"
        description="Sample cover letters the agent uses for tone matching. Add 2–3 examples."
        seeds={clSeeds}
        table="cover_letter_seeds"
        newLabel={newClLabel}
        newContent={newClContent}
        onLabelChange={setNewClLabel}
        onContentChange={setNewClContent}
        onAdd={() => addSeed("cover_letter_seeds", newClLabel, newClContent, newClMode)}
        onRemove={(id) => removeSeed("cover_letter_seeds", id)}
        adding={addingSeed === "cover_letter_seeds"}
        removing={removingSeed}
        placeholder="Dear Hiring Manager, I'm excited to apply for..."
        mode={newClMode}
        onModeChange={setNewClMode}
      />

      {/* Outreach Seeds */}
      <SeedSection
        title="Cold Outreach Samples"
        description="Sample LinkedIn/email messages the agent drafts outreach from."
        seeds={outreachSeeds}
        table="outreach_seeds"
        newLabel={newOrLabel}
        newContent={newOrContent}
        onLabelChange={setNewOrLabel}
        onContentChange={setNewOrContent}
        onAdd={() => addSeed("outreach_seeds", newOrLabel, newOrContent)}
        onRemove={(id) => removeSeed("outreach_seeds", id)}
        adding={addingSeed === "outreach_seeds"}
        removing={removingSeed}
        placeholder="Hi [Name], I came across your work at [Company] and..."
      />
    </div>
  )
}

function SeedSection({
  title, description, seeds, newLabel, newContent,
  onLabelChange, onContentChange, onAdd, onRemove,
  adding, removing, placeholder, mode, onModeChange,
}: {
  title: string
  description: string
  seeds: Seed[]
  table: string
  newLabel: string
  newContent: string
  onLabelChange: (v: string) => void
  onContentChange: (v: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
  adding: boolean
  removing: string | null
  placeholder: string
  mode?: "reuse" | "tone_only"
  onModeChange?: (v: "reuse" | "tone_only") => void
}) {
  return (
    <section
      className="rounded-xl p-6"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)" }}
    >
      <div className="mb-5">
        <SectionTitle>{title}</SectionTitle>
        <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
          {description}
        </p>
      </div>

      {seeds.length > 0 && (
        <div className="rounded-lg overflow-hidden mb-4" style={{ border: "1px solid var(--border)" }}>
          {seeds.map((seed, i) => (
            <div
              key={seed.id}
              className="px-4 py-3 transition-premium"
              style={{
                borderBottom: i < seeds.length - 1 ? "1px solid var(--border)" : "none",
                opacity: removing === seed.id ? 0.4 : 1,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[12px] font-semibold" style={{ color: "var(--foreground)" }}>
                      {seed.label ?? "Untitled"}
                    </p>
                    {seed.mode && (
                      <span
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}
                      >
                        {seed.mode === "reuse" ? "Use as-is" : "Tone only"}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed line-clamp-2"
                    style={{ color: "var(--muted-foreground)" }}>
                    {seed.content ?? ""}
                  </p>
                </div>
                <button
                  onClick={() => onRemove(seed.id)}
                  disabled={removing === seed.id}
                  className="p-2 rounded-md transition-premium active:scale-[0.92] shrink-0"
                  style={{ color: "oklch(0.480 0.005 220)" }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "oklch(0.350 0.140 15)"
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "oklch(0.960 0.020 15)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.color = "oklch(0.480 0.005 220)"
                    ;(e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
                  }}
                  aria-label="Remove"
                >
                  <Trash size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {seeds.length === 0 && (
        <div
          className="rounded-lg px-4 py-8 text-center mb-4"
          style={{ border: "1px dashed var(--border)" }}
        >
          <p className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>No samples yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            Add a sample below to help the agent match your writing tone.
          </p>
        </div>
      )}

      <div className="space-y-2">
        <StyledInput value={newLabel} onChange={onLabelChange} placeholder='Label, e.g. "Startup tone"' />
        {mode && onModeChange && (
          <div className="flex gap-4 py-1">
            {([
              { value: "tone_only" as const, label: "Tone only", desc: "Write a new letter matching this style" },
              { value: "reuse" as const, label: "Use as-is", desc: "Tailor this exact letter per job" },
            ]).map((opt) => (
              <label key={opt.value} className="flex items-start gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={mode === opt.value}
                  onChange={() => onModeChange(opt.value)}
                  className="mt-0.5"
                />
                <span>
                  <span className="text-[12px] font-medium block" style={{ color: "var(--foreground)" }}>
                    {opt.label}
                  </span>
                  <span className="text-[11px] block" style={{ color: "var(--muted-foreground)" }}>
                    {opt.desc}
                  </span>
                </span>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-2 items-start">
          <textarea
            value={newContent}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
            className="flex-1 px-3 py-2 text-[13px] rounded-lg outline-none transition-premium resize-none"
            style={{
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--foreground)",
            }}
          />
          <button
            onClick={onAdd}
            disabled={!newLabel.trim() || !newContent.trim() || adding}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              backgroundColor: (newLabel.trim() && newContent.trim() && !adding) ? "var(--primary)" : "var(--muted)",
              color: (newLabel.trim() && newContent.trim() && !adding) ? "var(--primary-foreground)" : "var(--muted-foreground)",
              cursor: (newLabel.trim() && newContent.trim() && !adding) ? "pointer" : "not-allowed",
            }}
          >
            <Plus size={13} weight="bold" />
            {adding ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </section>
  )
}
