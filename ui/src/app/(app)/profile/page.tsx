"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { CompanyLogo } from "@/components/company-logo"

const CSS = `
  @keyframes prof-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  @keyframes prof-spin { to { transform: rotate(360deg) } }
  .pf-input:focus { border-color: #0FA4AF !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(15,164,175,0.15) !important; }
  .pf-textarea:focus { border-color: #0FA4AF !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(15,164,175,0.15) !important; }
  input::placeholder, textarea::placeholder { color: rgba(0,49,53,0.4); }
  textarea { resize: vertical; font-family: inherit; }
`

const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "prof-shimmer 1.4s ease infinite",
  borderRadius: 6,
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
const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
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

const YES_NO = ["Yes", "No"]
const WORK_MODES = ["Remote", "Hybrid", "Onsite"]
const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"]
const RACES = ["American Indian / Alaska Native", "Asian", "Black / African American", "Hispanic / Latino", "Native Hawaiian / Pacific Islander", "White", "Two or more races", "Prefer not to say"]
const VETERANS = ["Yes", "No", "Prefer not to say"]
const DISABILITIES = ["Yes", "No", "Prefer not to say"]
const SENIORITY_OPTS = ["Internship", "Entry Level", "Mid Level", "Senior", "Lead", "Staff"]

interface WorkEntry { employer: string; title: string; startDate: string; endDate: string; description: string }
interface ToneSample { label: string; text: string }
interface Company { name: string; url: string }

interface Form {
  fullName: string; email: string; phone: string; currentLocation: string
  linkedin: string; github: string; portfolio: string
  school: string; major: string; degree: string; gpa: string; gradMonth: string; gradYear: string
  workAuth: string; sponsorship: string; relocate: string; workMode: string; startDate: string
  minSalary: string; desiredSalary: string
  gender: string; race: string; veteran: string; disability: string; pronouns: string
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

function SectionHeader({ title, editing, onToggle, extra }: { title: string; editing: boolean; onToggle: () => void; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h2>
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        {extra}
        <span onClick={onToggle} style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer" }}>
          {editing ? "Done" : "Edit"}
        </span>
      </div>
    </div>
  )
}

function ChipList({ items, onRemove }: { items: string[]; onRemove?: (i: number) => void }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {items.map((item, i) => (
        <span key={i} style={CHIP}>
          {item}
          {onRemove && (
            <span onClick={() => onRemove(i)} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 6 }}>×</span>
          )}
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
      <input
        type="text" placeholder={placeholder} value={value}
        onChange={onChange} onKeyDown={onKeyDown}
        className="pf-input" style={INPUT}
      />
      <button onClick={onAdd} style={PLUS_BTN}>+</button>
    </div>
  )
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [parseToast, setParseToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [form, setForm] = useState<Form>({
    fullName: "", email: "", phone: "", currentLocation: "",
    linkedin: "", github: "", portfolio: "",
    school: "", major: "", degree: "", gpa: "", gradMonth: "", gradYear: "",
    workAuth: "Yes", sponsorship: "No", relocate: "Yes", workMode: "Remote", startDate: "",
    minSalary: "", desiredSalary: "",
    gender: "Prefer not to say", race: "Prefer not to say",
    veteran: "Prefer not to say", disability: "Prefer not to say", pronouns: "",
  })
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")
  const [locations, setLocations] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState("")
  const [seniority, setSeniority] = useState<string[]>([])
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState("")
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyName, setCompanyName] = useState("")
  const [companyUrl, setCompanyUrl] = useState("")
  const [workHistory, setWorkHistory] = useState<WorkEntry[]>([])
  const [toneSamples, setToneSamples] = useState<ToneSample[]>([])
  const [resumeFileName, setResumeFileName] = useState("Upload resume")
  const [parsingResume, setParsingResume] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/profile").then(r => r.json()).catch(() => ({})),
      fetch("/api/settings").then(r => r.json()).catch(() => ({})),
      fetch("/api/watchlist").then(r => r.json()).catch(() => ({ watchlist: [] })),
      fetch("/api/seeds?table=cover_letter_seeds").then(r => r.json()).catch(() => []),
      fetch("/api/seeds?table=outreach_seeds").then(r => r.json()).catch(() => []),
    ]).then(([profileData, settingsData, watchlistData, coverSeeds, outreachSeeds]) => {
      const p = profileData ?? {}
      const prefs = settingsData?.preferences ?? {}
      setForm(prev => ({
        ...prev,
        fullName: p.full_name ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
        currentLocation: p.current_location ?? "",
        linkedin: p.linkedin_url ?? "",
        github: p.github_url ?? "",
        portfolio: p.portfolio ?? "",
        school: Array.isArray(p.education) && p.education[0]
          ? ((p.education[0] as Record<string,string>).institution ?? (p.education[0] as Record<string,string>).school ?? "") : "",
        major: p.major ?? (Array.isArray(p.education) && p.education[0] ? (p.education[0] as Record<string,string>).field ?? "" : ""),
        degree: Array.isArray(p.education) && p.education[0]
          ? (p.education[0] as Record<string,string>).degree ?? "" : "",
        gpa: p.gpa ?? "",
        gradMonth: p.grad_month ?? "",
        gradYear: p.grad_year ?? "",
        workAuth: p.work_auth ?? "Yes",
        sponsorship: p.sponsorship ?? "No",
        relocate: p.relocate ?? "Yes",
        workMode: p.work_mode ?? "Remote",
        startDate: p.start_date ?? "",
        minSalary: prefs.salary_floor ? String(prefs.salary_floor) : "",
        desiredSalary: prefs.desired_salary ? String(prefs.desired_salary) : "",
        gender: p.gender ?? "Prefer not to say",
        race: p.race ?? "Prefer not to say",
        veteran: p.veteran ?? "Prefer not to say",
        disability: p.disability ?? "Prefer not to say",
        pronouns: p.pronouns ?? "",
      }))
      setSkills(Array.isArray(p.skills) ? p.skills : [])
      setLocations(Array.isArray(prefs.locations) ? prefs.locations : [])
      setSeniority(Array.isArray(prefs.seniority) ? prefs.seniority : [])
      setKeywords(Array.isArray(prefs.role_keywords) ? prefs.role_keywords : [])
      if (Array.isArray(p.work_history)) setWorkHistory(p.work_history as WorkEntry[])
      if (Array.isArray(watchlistData?.watchlist)) setCompanies(watchlistData.watchlist)
      const allSeeds = [...(Array.isArray(coverSeeds) ? coverSeeds : []), ...(Array.isArray(outreachSeeds) ? outreachSeeds : [])]
      setToneSamples(allSeeds.map((s: Record<string, string>) => ({ label: s.label ?? "Sample", text: s.content ?? "" })))
    }).finally(() => setLoading(false))
  }, [])

  const f = useCallback((key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = e.target.value
    setForm(prev => ({ ...prev, [key]: v }))
  }, [])

  function toggleSection(key: string) {
    setEditing(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function persistProfile(f: Form, sk: string[], wh: WorkEntry[]) {
    return fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: f.fullName, email: f.email, phone: f.phone,
        current_location: f.currentLocation, linkedin_url: f.linkedin,
        github_url: f.github, portfolio: f.portfolio,
        education: [{ institution: f.school, degree: f.degree, field: f.major }],
        major: f.major, gpa: f.gpa, grad_month: f.gradMonth, grad_year: f.gradYear,
        work_auth: f.workAuth, sponsorship: f.sponsorship, relocate: f.relocate,
        work_mode: f.workMode, start_date: f.startDate, skills: sk,
        work_history: wh,
        gender: f.gender, race: f.race, veteran: f.veteran,
        disability: f.disability, pronouns: f.pronouns,
      }),
    })
  }

  function persistWatchlist(list: Company[]) {
    return fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        watchlist: list.map(c => ({ company_name: c.name, careers_url: c.url })),
      }),
    })
  }

  async function addCompanyAndPersist() {
    const name = companyName.trim()
    if (!name) return
    const next = [...companies, { name, url: companyUrl }]
    setCompanies(next)
    setCompanyName(""); setCompanyUrl("")
    const res = await persistWatchlist(next).catch(() => null)
    if (!res?.ok) {
      setParseToast("Couldn't save — try Save all")
      if (toastTimer.current) clearTimeout(toastTimer.current)
      toastTimer.current = setTimeout(() => setParseToast(null), 3000)
    }
  }

  async function removeCompanyAndPersist(i: number) {
    const next = companies.filter((_, idx) => idx !== i)
    setCompanies(next)
    await persistWatchlist(next).catch(() => null)
  }

  async function save() {
    setSaving(true)
    try {
      const [profileRes, settingsRes] = await Promise.all([
        persistProfile(form, skills, workHistory),
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: {
              locations, seniority, role_keywords: keywords,
              salary_floor: form.minSalary ? parseInt(form.minSalary.replace(/\D/g, ""), 10) : null,
              desired_salary: form.desiredSalary ? parseInt(form.desiredSalary.replace(/\D/g, ""), 10) : null,
            },
            watchlist: companies.map(c => ({ company_name: c.name, careers_url: c.url })),
          }),
        }),
      ])
      if (!profileRes.ok || !settingsRes.ok) {
        const badRes = !profileRes.ok ? profileRes : settingsRes
        const body = await badRes.json().catch(() => null)
        throw new Error(body?.error ?? "save failed")
      }
      setSaveMsg("Saved")
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Error saving")
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(null), 2500)
    }
  }

  async function handleResumeUpload(file: File) {
    setResumeFileName(file.name)
    setParsingResume(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)

    const body = new FormData()
    body.append("file", file)

    const minDelay = new Promise(resolve => setTimeout(resolve, 3000))
    const parsePromise = fetch("/api/parse-resume", { method: "POST", body })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)

    const [data] = await Promise.all([parsePromise, minDelay])

    if (data && !data.error) {
      const mergedForm: Form = {
        ...form,
        fullName: data.fullName || form.fullName,
        email: data.email || form.email,
        phone: data.phone || form.phone,
        currentLocation: data.currentLocation || form.currentLocation,
        linkedin: data.linkedin || form.linkedin,
        github: data.github || form.github,
        portfolio: data.portfolio || form.portfolio,
        school: data.school || form.school,
        major: data.major || form.major,
        degree: data.degree || form.degree,
        gpa: data.gpa || form.gpa,
        gradMonth: data.gradMonth || form.gradMonth,
        gradYear: data.gradYear || form.gradYear,
      }
      const mergedSkills = Array.isArray(data.skills) && data.skills.length > 0 ? data.skills : skills
      const combinedHistory = [...(data.workHistory ?? []), ...(data.projects ?? [])]
      const mergedWorkHistory = combinedHistory.length > 0 ? combinedHistory : workHistory

      setForm(mergedForm)
      setSkills(mergedSkills)
      setWorkHistory(mergedWorkHistory)

      const persistRes = await persistProfile(mergedForm, mergedSkills, mergedWorkHistory).catch(() => null)
      setParseToast(persistRes?.ok ? `Parsed ${file.name}` : "Parsed, but couldn't save — try Save all")
    } else {
      setParseToast(`Couldn't parse ${file.name}`)
    }

    setParsingResume(false)
    toastTimer.current = setTimeout(() => setParseToast(null), 3000)
  }

  const ins = form.fullName.trim().split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "—"

  const normalizeUrl = (v: string) => {
    if (!v.trim()) return "#"
    return /^https?:\/\//i.test(v) ? v : "https://" + v
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ ...SHIMMER, width: 64, height: 64, borderRadius: 16, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ ...SHIMMER, height: 18, width: 180, marginBottom: 10 }} />
            <div style={{ ...SHIMMER, height: 12, width: 260 }} />
          </div>
        </div>
        {[4, 2, 3, 2].map((count, i) => (
          <div key={i} style={CARD}>
            <div style={{ ...SHIMMER, height: 16, width: 160, marginBottom: 20 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "18px 24px" }}>
              {Array(count).fill(0).map((_, j) => (
                <div key={j}>
                  <div style={{ ...SHIMMER, height: 10, width: 70, marginBottom: 8 }} />
                  <div style={{ ...SHIMMER, height: 14, width: "90%" }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Toast */}
      {(parseToast || saveMsg) && (
        <div style={{
          position: "fixed", top: 24, right: 24, display: "flex", alignItems: "center", gap: 10,
          background: "#fff", color: "#003135", borderRadius: 12, padding: "13px 18px",
          boxShadow: "0 12px 28px rgba(0,49,53,0.18)", border: "1px solid rgba(15,164,175,0.3)",
          fontSize: 13, fontWeight: 600, zIndex: 50,
        }}>
          <span style={{ color: "#0FA4AF", fontSize: 16 }}>✓</span>
          {parseToast ?? saveMsg}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4 }}>

        {/* Header card */}
        <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#024950", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, flexShrink: 0 }}>
            {ins}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>{form.fullName || "—"}</h1>
            <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.5)" }}>
              {[form.currentLocation, form.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
            <label style={{
              display: "inline-flex", alignItems: "center", gap: 8, background: "#F5F8F7", borderRadius: 10,
              padding: "9px 14px", fontSize: 13, fontWeight: 600,
              cursor: parsingResume ? "default" : "pointer", color: "#024950",
              opacity: parsingResume ? 0.85 : 1,
            }}>
              <input type="file" accept=".pdf,.doc,.docx" disabled={parsingResume} onChange={e => {
                const file = e.target.files?.[0]
                e.target.value = ""
                if (!file) return
                if (file.size > 8 * 1024 * 1024) return
                handleResumeUpload(file)
              }} style={{ display: "none" }} />
              {parsingResume && (
                <span style={{
                  width: 13, height: 13, borderRadius: "50%", flexShrink: 0,
                  border: "2px solid rgba(2,73,80,0.25)", borderTopColor: "#0FA4AF",
                  animation: "prof-spin 0.7s linear infinite",
                }} />
              )}
              {parsingResume ? "Parsing resume…" : resumeFileName}
            </label>
            <button onClick={save} disabled={saving} style={{
              padding: "9px 20px", borderRadius: 10, border: "none", fontFamily: "inherit",
              fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer",
              background: "#964734", color: "#fff", opacity: saving ? 0.6 : 1,
            }}>
              {saving ? "Saving…" : "Save all"}
            </button>
          </div>
        </div>

        {/* Personal info */}
        <div style={CARD}>
          <SectionHeader title="Personal info" editing={!!editing.personal} onToggle={() => toggleSection("personal")} />
          {!editing.personal ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "18px 24px", marginBottom: 16 }}>
                {([
                  ["Full name", form.fullName], ["Email", form.email], ["Phone", form.phone],
                  ["Location", form.currentLocation], ["School", form.school], ["Major", form.major],
                  ["Degree", form.degree], ["GPA", form.gpa],
                  ["Graduation", [form.gradMonth, form.gradYear].filter(Boolean).join(" ")],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label}>
                    <p style={SUMMARY_LABEL}>{label}</p>
                    <p style={SUMMARY_VALUE}>{value || "—"}</p>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 16 }}>
                <p style={SUMMARY_LABEL}>Skills</p>
                {skills.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                    {skills.map((s, i) => <span key={i} style={CHIP}>{s}</span>)}
                  </div>
                ) : <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(0,49,53,0.4)" }}>No skills added yet.</p>}
              </div>
              <div>
                <p style={SUMMARY_LABEL}>Links</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                  {[
                    {
                      title: "LinkedIn", value: form.linkedin, href: normalizeUrl(form.linkedin), bg: "#0A66C2",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
                        </svg>
                      ),
                    },
                    {
                      title: "GitHub", value: form.github, href: normalizeUrl(form.github), bg: "#181717",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
                          <path d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.63-5.49 5.92.43.37.82 1.1.82 2.22v3.29c0 .32.21.7.82.58A12 12 0 0 0 12 .3z" />
                        </svg>
                      ),
                    },
                    {
                      title: "Portfolio", value: form.portfolio, href: normalizeUrl(form.portfolio), bg: "#024950",
                      icon: (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18M12 3c2.5 2.6 3.9 5.7 3.9 9S14.5 18.4 12 21c-2.5-2.6-3.9-5.7-3.9-9S9.5 5.6 12 3z" />
                        </svg>
                      ),
                    },
                  ].filter(l => l.value).map((l, i) => (
                    <a key={i} href={l.href} target="_blank" rel="noopener noreferrer" title={l.title}
                      style={{ width: 40, height: 40, borderRadius: 12, background: l.bg, display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                      {l.icon}
                    </a>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                {([
                  ["Full name", "fullName"], ["Email", "email"], ["Phone", "phone"], ["Current location", "currentLocation"],
                  ["LinkedIn", "linkedin"], ["GitHub", "github"], ["Portfolio", "portfolio"],
                  ["School", "school"], ["Major", "major"], ["Degree", "degree"], ["GPA", "gpa"],
                ] as [string, keyof Form][]).map(([label, key]) => (
                  <div key={key}>
                    <label style={LABEL}>{label}</label>
                    <input className="pf-input" type="text" value={form[key]} onChange={f(key)} style={INPUT} />
                  </div>
                ))}
                <div>
                  <label style={LABEL}>Grad month / year</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input className="pf-input" type="text" value={form.gradMonth} onChange={f("gradMonth")} style={INPUT} placeholder="May" />
                    <input className="pf-input" type="text" value={form.gradYear} onChange={f("gradYear")} style={INPUT} placeholder="2027" />
                  </div>
                </div>
              </div>
              <label style={LABEL}>Skills</label>
              <ChipList items={skills} onRemove={i => setSkills(prev => prev.filter((_, idx) => idx !== i))} />
              <div style={{ marginTop: 10 }}>
                <TagInput value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && skillInput.trim()) { e.preventDefault(); setSkills(p => [...p, skillInput.trim()]); setSkillInput("") } }}
                  onAdd={() => { if (skillInput.trim()) { setSkills(p => [...p, skillInput.trim()]); setSkillInput("") } }}
                  placeholder="Add skill, press Enter" />
              </div>
            </>
          )}
        </div>

        {/* Work authorization */}
        <div style={CARD}>
          <SectionHeader title="Work authorization" editing={!!editing.workAuth} onToggle={() => toggleSection("workAuth")} />
          {!editing.workAuth ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "18px 24px" }}>
              {([
                ["Authorized in US", form.workAuth], ["Needs sponsorship", form.sponsorship],
                ["Willing to relocate", form.relocate], ["Work mode", form.workMode], ["Start date", form.startDate || "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}>
                  <p style={SUMMARY_LABEL}>{label}</p>
                  <p style={SUMMARY_VALUE}>{value || "—"}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              {([
                { label: "Authorized to work in the US?", key: "workAuth" as const, opts: YES_NO },
                { label: "Require visa sponsorship?", key: "sponsorship" as const, opts: YES_NO },
                { label: "Willing to relocate?", key: "relocate" as const, opts: YES_NO },
                { label: "Work mode preference", key: "workMode" as const, opts: WORK_MODES },
              ]).map(({ label, key, opts }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={LABEL}>{label}</label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {opts.map(opt => <PillBtn key={opt} label={opt} active={form[key] === opt} onClick={() => setForm(p => ({ ...p, [key]: opt }))} />)}
                  </div>
                </div>
              ))}
              <div>
                <label style={LABEL}>Available start date</label>
                <input className="pf-input" type="text" value={form.startDate} onChange={f("startDate")} style={INPUT} placeholder="Immediately" />
              </div>
            </>
          )}
        </div>

        {/* Work history */}
        <div style={CARD}>
          <SectionHeader
            title="Work history" editing={!!editing.workHistory} onToggle={() => toggleSection("workHistory")}
            extra={editing.workHistory ? (
              <span onClick={() => setWorkHistory(p => [...p, { employer: "", title: "", startDate: "", endDate: "", description: "" }])}
                style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer" }}>
                + Add position
              </span>
            ) : undefined}
          />
          {!editing.workHistory ? (
            workHistory.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {workHistory.map((job, i) => (
                  <div key={i} style={{ borderBottom: "1px solid rgba(0,49,53,0.06)", paddingBottom: 14 }}>
                    <p style={{ margin: "0 0 2px", fontSize: 14, fontWeight: 700 }}>{job.title} · {job.employer}</p>
                    <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.45)" }}>{job.startDate} – {job.endDate}</p>
                    {job.description && <p style={{ margin: "8px 0 0", fontSize: 13, color: "rgba(0,49,53,0.6)", lineHeight: 1.6 }}>{job.description}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No work history added</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 300 }}>Add your past roles so the agent can fill multi-row work history fields on real applications.</p>
              </div>
            )
          ) : (
            <>
              {workHistory.map((job, i) => (
                <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 18, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                    <span onClick={() => setWorkHistory(p => p.filter((_, idx) => idx !== i))} style={{ cursor: "pointer", opacity: 0.45, fontSize: 13 }}>Remove</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                    {([["Employer", "employer"], ["Job title", "title"], ["Start date", "startDate"], ["End date", "endDate"]] as [string, keyof WorkEntry][]).map(([label, key]) => (
                      <div key={key}>
                        <label style={LABEL}>{label}</label>
                        <input className="pf-input" type="text"
                          value={job[key]}
                          onChange={e => setWorkHistory(p => p.map((w, idx) => idx === i ? { ...w, [key]: e.target.value } : w))}
                          style={INPUT} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label style={LABEL}>Description</label>
                    <textarea className="pf-textarea"
                      value={job.description}
                      onChange={e => setWorkHistory(p => p.map((w, idx) => idx === i ? { ...w, description: e.target.value } : w))}
                      style={{ ...INPUT, marginTop: 0, minHeight: 90 }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Job preferences */}
        <div style={CARD}>
          <SectionHeader title="Job preferences" editing={!!editing.prefs} onToggle={() => toggleSection("prefs")} />
          {!editing.prefs ? (
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
                <div><p style={SUMMARY_LABEL}>Minimum salary</p><p style={SUMMARY_VALUE}>{form.minSalary || "—"}</p></div>
                <div><p style={SUMMARY_LABEL}>Desired salary</p><p style={SUMMARY_VALUE}>{form.desiredSalary || "—"}</p></div>
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
                  <input className="pf-input" type="text" value={form.minSalary} onChange={f("minSalary")} style={INPUT} placeholder="$80,000" />
                </div>
                <div>
                  <label style={LABEL}>Desired salary</label>
                  <input className="pf-input" type="text" value={form.desiredSalary} onChange={f("desiredSalary")} style={INPUT} placeholder="$110,000" />
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
            </>
          )}
        </div>

        {/* Company watchlist */}
        <div style={CARD}>
          <SectionHeader title="Company watchlist" editing={!!editing.watchlist} onToggle={() => toggleSection("watchlist")} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            {companies.length > 0 ? companies.map((co, i) => (
              <div key={i} style={{ position: "relative" }}>
                <CompanyLogo name={co.name} size={46} />
                {editing.watchlist && (
                  <span onClick={() => removeCompanyAndPersist(i)}
                    style={{ position: "absolute", top: -6, right: -6, width: 17, height: 17, borderRadius: "50%", background: "#003135", color: "#fff", fontSize: 11, lineHeight: "17px", textAlign: "center", cursor: "pointer", userSelect: "none" }}>×</span>
                )}
              </div>
            )) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No companies on your watchlist</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 280 }}>Add dream companies and the agent will check them more aggressively.</p>
              </div>
            )}
          </div>
          {editing.watchlist && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
                {companyName.trim() && <CompanyLogo name={companyName.trim()} size={42} />}
                <input className="pf-input" type="text" placeholder="Company name" value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && companyName.trim()) { e.preventDefault(); addCompanyAndPersist() } }}
                  style={{ ...INPUT, flex: 1 }} />
              </div>
              <button onClick={addCompanyAndPersist}
                style={{ marginTop: 14, padding: "11px 20px", borderRadius: 20, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                + Add company
              </button>
            </>
          )}
        </div>

        {/* Demographics */}
        <div style={CARD}>
          <SectionHeader title="Demographic info" editing={!!editing.demo} onToggle={() => toggleSection("demo")} />
          <p style={{ margin: "0 0 16px", fontSize: 12, color: "rgba(0,49,53,0.4)" }}>Voluntary — never affects your applications or scoring</p>
          {!editing.demo ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: "18px 24px" }}>
              {([
                ["Gender", form.gender], ["Race / ethnicity", form.race],
                ["Veteran status", form.veteran], ["Disability status", form.disability], ["Pronouns", form.pronouns || "—"],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label}><p style={SUMMARY_LABEL}>{label}</p><p style={SUMMARY_VALUE}>{value}</p></div>
              ))}
            </div>
          ) : (
            <>
              {([
                { label: "Gender", key: "gender" as const, opts: GENDERS },
                { label: "Race / ethnicity", key: "race" as const, opts: RACES },
                { label: "Veteran status", key: "veteran" as const, opts: VETERANS },
                { label: "Disability status", key: "disability" as const, opts: DISABILITIES },
              ]).map(({ label, key, opts }) => (
                <div key={key} style={{ marginBottom: 20 }}>
                  <label style={LABEL}>{label}</label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                    {opts.map(opt => <PillBtn key={opt} label={opt} active={form[key] === opt} onClick={() => setForm(p => ({ ...p, [key]: opt }))} />)}
                  </div>
                </div>
              ))}
              <div>
                <label style={LABEL}>Pronouns</label>
                <input className="pf-input" type="text" value={form.pronouns} onChange={f("pronouns")} style={INPUT} placeholder="she/her" />
              </div>
            </>
          )}
        </div>

        {/* Tone samples */}
        <div style={{ ...CARD, marginBottom: 20 }}>
          <SectionHeader
            title="Tone samples" editing={!!editing.tone} onToggle={() => toggleSection("tone")}
            extra={editing.tone ? (
              <span onClick={() => setToneSamples(p => [...p, { label: "", text: "" }])}
                style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer" }}>
                + Add sample
              </span>
            ) : undefined}
          />
          {!editing.tone ? (
            toneSamples.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {toneSamples.map((s, i) => (
                  <div key={i} style={{ borderBottom: "1px solid rgba(0,49,53,0.06)", paddingBottom: 14 }}>
                    <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: "rgba(0,49,53,0.5)" }}>{s.label || "Sample"}</p>
                    <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: "rgba(0,49,53,0.7)" }}>{s.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No tone samples yet</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 300 }}>Add a cover letter or message you&apos;ve written so the agent can match your voice.</p>
              </div>
            )
          ) : (
            toneSamples.map((s, i) => (
              <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <input className="pf-input" type="text" placeholder="Label" value={s.label}
                  onChange={e => setToneSamples(p => p.map((r, idx) => idx === i ? { ...r, label: e.target.value } : r))}
                  style={{ ...INPUT, marginBottom: 10 }} />
                <textarea className="pf-textarea" placeholder="Sample text…" value={s.text}
                  onChange={e => setToneSamples(p => p.map((r, idx) => idx === i ? { ...r, text: e.target.value } : r))}
                  style={{ ...INPUT, minHeight: 90 }} />
              </div>
            ))
          )}
        </div>

      </div>
    </>
  )
}
