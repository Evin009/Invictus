"use client"

import { useEffect, useRef, useState } from "react"

interface Preferences {
  locations: string[] | null
  seniority: string[] | null
  role_keywords: string[] | null
  salary_floor: number | null
  desired_salary: number | null
}

const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
}
const INPUT: React.CSSProperties = {
  width: "100%", padding: "13px 14px", fontSize: 14, fontFamily: "inherit",
  borderRadius: 8, border: "1px solid rgba(0,49,53,0.14)", outline: "none",
  background: "#F5F8F7", color: "#003135",
}
const LABEL: React.CSSProperties = {
  display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em",
  color: "rgba(0,49,53,0.6)", marginBottom: 8,
}
const CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", padding: "6px 12px",
  background: "rgba(150,71,52,0.14)", color: "#964734", borderRadius: 20, fontSize: 13, fontWeight: 600,
}
const SUMMARY_LABEL: React.CSSProperties = {
  margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(0,49,53,0.4)",
}
const SUMMARY_VALUE: React.CSSProperties = {
  margin: 0, fontSize: 14, fontWeight: 600, wordBreak: "break-word", lineHeight: 1.4,
}
const PLUS_BTN: React.CSSProperties = {
  width: 44, flexShrink: 0, borderRadius: 8, border: "none",
  background: "rgba(15,164,175,0.14)", color: "#024950", fontSize: 18, cursor: "pointer",
}
const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "jpc-shimmer 1.4s ease infinite",
  borderRadius: 6,
}

const SENIORITY_OPTS = ["Internship", "Entry Level", "Mid Level", "Senior", "Lead", "Staff"]

function SectionHeader({ title, editing, onToggle }: { title: string; editing: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
      <span onClick={onToggle} style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer" }}>
        {editing ? "Done" : "Edit"}
      </span>
    </div>
  )
}

function ChipList({ items, onRemove }: { items: string[]; onRemove: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={CHIP}>
          {item}
          <span onClick={() => onRemove(i)} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 6 }}>×</span>
        </span>
      ))}
    </div>
  )
}

function TagInput({ value, onChange, onKeyDown, onAdd, placeholder }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onAdd: () => void; placeholder: string
}) {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <input type="text" placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} className="pf-input" style={INPUT} />
      <button onClick={onAdd} style={PLUS_BTN}>+</button>
    </div>
  )
}

function PillBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 18px", borderRadius: 20, border: "none", fontFamily: "inherit",
      fontSize: 14, fontWeight: 600, cursor: "pointer",
      background: active ? "#964734" : "#F5F8F7", color: active ? "#fff" : "rgba(0,49,53,0.7)",
    }}>
      {label}
    </button>
  )
}

// Same design as the profile page's job preferences card — used on both
// Profile and Settings so the two never drift apart. Self-contained:
// fetches and persists on its own (saves immediately on "Done"), no props needed.
export function JobPreferencesCard() {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [locations, setLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState("")
  const [seniority, setSeniority] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [minSalary, setMinSalary] = useState("")
  const [desiredSalary, setDesiredSalary] = useState("")

  useEffect(() => {
    fetch("/api/settings")
      .then(r => r.json())
      .then(d => {
        const prefs: Preferences = d?.preferences ?? {}
        setLocations(Array.isArray(prefs.locations) ? prefs.locations : [])
        setSeniority(Array.isArray(prefs.seniority) ? prefs.seniority : [])
        setKeywords(Array.isArray(prefs.role_keywords) ? prefs.role_keywords : [])
        setMinSalary(prefs.salary_floor ? String(prefs.salary_floor) : "")
        setDesiredSalary(prefs.desired_salary ? String(prefs.desired_salary) : "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function toggleEditing() {
    if (editing) {
      setSaving(true)
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: {
              locations, seniority, role_keywords: keywords,
              salary_floor: minSalary ? parseInt(minSalary.replace(/\D/g, ""), 10) : null,
              desired_salary: desiredSalary ? parseInt(desiredSalary.replace(/\D/g, ""), 10) : null,
            },
          }),
        })
        if (!res.ok) throw new Error()
      } catch {
        setToast("Couldn't save — try again")
        if (toastTimer.current) clearTimeout(toastTimer.current)
        toastTimer.current = setTimeout(() => setToast(null), 3000)
      } finally {
        setSaving(false)
      }
    }
    setEditing(p => !p)
  }

  if (loading) {
    return (
      <div style={CARD}>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes jpc-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }" }} />
        <div style={{ ...SHIMMER, height: 17, width: 140, marginBottom: 18 }} />
        <div style={{ ...SHIMMER, height: 60, marginBottom: 14 }} />
        <div style={{ ...SHIMMER, height: 60 }} />
      </div>
    )
  }

  return (
    <div style={CARD}>
      <SectionHeader title="Job preferences" editing={editing} onToggle={toggleEditing} />

      {toast && <p style={{ fontSize: 12, color: "#964734", margin: "0 0 14px" }}>{toast}</p>}

      {!editing ? (
        <>
          <div style={{ marginBottom: 14 }}>
            <p style={SUMMARY_LABEL}>Target locations</p>
            {locations.length > 0
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{locations.map((l, i) => <span key={i} style={CHIP}>{l}</span>)}</div>
              : <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(0,49,53,0.4)" }}>No target locations — agent considers any location.</p>}
          </div>
          <div style={{ marginBottom: 14 }}>
            <p style={SUMMARY_LABEL}>Seniority levels</p>
            {seniority.length > 0
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{seniority.map((s, i) => <span key={i} style={CHIP}>{s}</span>)}</div>
              : <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(0,49,53,0.4)" }}>No seniority levels selected.</p>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "18px 24px", marginBottom: 14 }}>
            <div><p style={SUMMARY_LABEL}>Minimum salary</p><p style={SUMMARY_VALUE}>{minSalary || "—"}</p></div>
            <div><p style={SUMMARY_LABEL}>Desired salary</p><p style={SUMMARY_VALUE}>{desiredSalary || "—"}</p></div>
          </div>
          <div>
            <p style={SUMMARY_LABEL}>Role keywords</p>
            {keywords.length > 0
              ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>{keywords.map((k, i) => <span key={i} style={CHIP}>{k}</span>)}</div>
              : <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(0,49,53,0.4)" }}>No role keywords set.</p>}
          </div>
        </>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL}>Target locations</label>
            <ChipList items={locations} onRemove={i => setLocations(p => p.filter((_, idx) => idx !== i))} />
            <div style={{ marginTop: 10 }}>
              <TagInput value={locationInput} onChange={e => setLocationInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && locationInput.trim()) { e.preventDefault(); setLocations(p => [...p, locationInput.trim()]); setLocationInput("") } }}
                onAdd={() => { if (locationInput.trim()) { setLocations(p => [...p, locationInput.trim()]); setLocationInput("") } }}
                placeholder="San Francisco, CA" />
            </div>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={LABEL}>Seniority levels</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {SENIORITY_OPTS.map(opt => (
                <PillBtn key={opt} label={opt} active={seniority.includes(opt)}
                  onClick={() => setSeniority(p => p.includes(opt) ? p.filter(x => x !== opt) : [...p, opt])} />
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={LABEL}>Minimum salary</label>
              <input className="pf-input" type="text" value={minSalary} onChange={e => setMinSalary(e.target.value)} style={INPUT} placeholder="$80,000" />
            </div>
            <div>
              <label style={LABEL}>Desired salary</label>
              <input className="pf-input" type="text" value={desiredSalary} onChange={e => setDesiredSalary(e.target.value)} style={INPUT} placeholder="$110,000" />
            </div>
          </div>
          <div>
            <label style={LABEL}>Role keywords</label>
            <ChipList items={keywords} onRemove={i => setKeywords(p => p.filter((_, idx) => idx !== i))} />
            <div style={{ marginTop: 10 }}>
              <TagInput value={keywordInput} onChange={e => setKeywordInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && keywordInput.trim()) { e.preventDefault(); setKeywords(p => [...p, keywordInput.trim()]); setKeywordInput("") } }}
                onAdd={() => { if (keywordInput.trim()) { setKeywords(p => [...p, keywordInput.trim()]); setKeywordInput("") } }}
                placeholder="Software Engineer" />
            </div>
          </div>
          {saving && <p style={{ fontSize: 12, color: "rgba(0,49,53,0.4)", margin: "14px 0 0" }}>Saving…</p>}
        </>
      )}
    </div>
  )
}
