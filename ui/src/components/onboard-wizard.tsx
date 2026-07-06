"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "strata-onboarding-progress-v1"

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkEntry  { employer: string; title: string; startDate: string; endDate: string; description: string }
interface SeedEntry  { label: string; text: string }

interface Form {
  fullName: string; email: string; phone: string; currentLocation: string
  linkedin: string; github: string; portfolio: string
  school: string; major: string; degree: string; gpa: string; gradMonth: string; gradYear: string
  workAuth: string | null; sponsorship: string | null; relocate: string | null; workMode: string | null; startDate: string
  minSalary: string; desiredSalary: string
  gender: string | null; race: string | null; veteran: string | null; disability: string | null; pronouns: string
}

interface WizardState {
  stage: "upload" | "extracting" | "review" | "form"
  resumeFileName: string
  step: number
  showSuccess: boolean
  uploadError: string | null
  form: Form
  skills: string[]; skillInput: string
  locations: string[]; locationInput: string
  seniority: string[]
  keywords: string[]; keywordInput: string
  companies: Array<{ name: string; url: string }>; companyName: string; companyUrl: string
  workHistory: WorkEntry[]
  coverSamples: SeedEntry[]
  outreachSamples: SeedEntry[]
  emailError: boolean
}

const INITIAL_FORM: Form = {
  fullName: "", email: "", phone: "", currentLocation: "",
  linkedin: "", github: "", portfolio: "",
  school: "", major: "", degree: "", gpa: "", gradMonth: "", gradYear: "",
  workAuth: null, sponsorship: null, relocate: null, workMode: null, startDate: "",
  minSalary: "", desiredSalary: "",
  gender: null, race: null, veteran: null, disability: null, pronouns: "",
}

const INITIAL_STATE: WizardState = {
  stage: "upload", resumeFileName: "", step: 0, showSuccess: false, uploadError: null,
  form: INITIAL_FORM,
  skills: [], skillInput: "",
  locations: [], locationInput: "",
  seniority: [],
  keywords: [], keywordInput: "",
  companies: [], companyName: "", companyUrl: "",
  workHistory: [{ employer: "", title: "", startDate: "", endDate: "", description: "" }],
  coverSamples: [{ label: "", text: "" }],
  outreachSamples: [{ label: "", text: "" }],
  emailError: false,
}

const TAB_LABELS = ["Personal", "Work Auth", "Work History", "Preferences", "Watchlist", "Demographics", "Tone Samples"]
const SENIORITY_LEVELS = ["Internship", "Entry Level", "Mid Level", "Senior", "Lead", "Staff"]
const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"]
const RACE_OPTIONS = ["American Indian / Alaska Native", "Asian", "Black / African American", "Hispanic / Latino", "Native Hawaiian / Pacific Islander", "White", "Two or more races", "Prefer not to say"]
const YES_NO = ["Yes", "No"]
const VETERAN_OPTIONS = ["Yes", "No", "Prefer not to say"]
const DISABILITY_OPTIONS = ["Yes", "No", "Prefer not to say"]
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "Onsite"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Injected CSS ─────────────────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box}
  body{margin:0}
  .ob-input{width:100%;padding:13px 14px;font-size:14px;font-family:'Space Grotesk',sans-serif;border-radius:8px;border:1px solid rgba(0,49,53,0.14);outline:none;background:#F5F8F7;color:#003135;}
  .ob-input::placeholder{color:rgba(0,49,53,0.4)}
  .ob-input:focus{border-color:#0FA4AF;background:#fff;box-shadow:0 0 0 3px rgba(15,164,175,0.15);}
  .ob-textarea{width:100%;padding:13px 14px;font-size:14px;font-family:'Space Grotesk',sans-serif;border-radius:8px;border:1px solid rgba(0,49,53,0.14);outline:none;background:#F5F8F7;color:#003135;resize:vertical;min-height:110px;margin-top:10px;}
  .ob-textarea::placeholder{color:rgba(0,49,53,0.4)}
  .ob-textarea:focus{border-color:#0FA4AF;background:#fff;box-shadow:0 0 0 3px rgba(15,164,175,0.15);}
  @keyframes ob-spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion: reduce){
    [style*="ob-spin"]{animation:none !important;}
  }
`

// ─── Shared small components ──────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", color: "rgba(0,49,53,0.6)", marginBottom: 8 }}>
      {children}
    </label>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", background: "rgba(150,71,52,0.14)", color: "#964734", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 6 }}>×</span>
    </span>
  )
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 18px", borderRadius: 20, border: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", background: selected ? "#964734" : "#EDF2F1", color: selected ? "#fff" : "rgba(0,49,53,0.7)" }}>
      {label}
    </button>
  )
}

function PlusBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 44, flexShrink: 0, borderRadius: 8, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontSize: 18, cursor: "pointer", height: 47 }}>+</button>
  )
}

function ChipRow({ chips }: { chips: string[]; }) {
  return chips.length > 0
    ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>{chips.map((c, i) => <Chip key={i} label={c} onRemove={() => {}} />)}</div>
    : null
}

// ─── Main component ───────────────────────────────────────────────────────────
export function OnboardWizard() {
  const router = useRouter()
  const [s, setS] = useState<WizardState>(INITIAL_STATE)
  const [isSaving, setIsSaving] = useState(false)
  const isFirstMount = useRef(true)

  // Load persisted progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === "object") setS(saved)
      }
    } catch {}
  }, [])

  // Persist on every change (skip first mount to avoid overwriting loaded state)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }, [s])

  function upd(patch: Partial<WizardState>) { setS(p => ({ ...p, ...patch })) }
  function updForm(key: keyof Form, val: string | null) { setS(p => ({ ...p, form: { ...p.form, [key]: val } })) }
  function toggleForm(key: keyof Form, val: string) { setS(p => ({ ...p, form: { ...p.form, [key]: p.form[key] === val ? null : val } })) }
  function toggleSeniority(label: string) { setS(p => ({ ...p, seniority: p.seniority.includes(label) ? p.seniority.filter(x => x !== label) : [...p.seniority, label] })) }

  // Resume upload
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = "." + file.name.toLowerCase().split(".").pop()
    if (![".pdf", ".doc", ".docx"].includes(ext)) { upd({ uploadError: "Please upload a PDF, DOC, or DOCX file." }); e.target.value = ""; return }
    if (file.size > 8 * 1024 * 1024) { upd({ uploadError: "File is too large — max 8MB." }); e.target.value = ""; return }
    upd({ stage: "extracting", resumeFileName: file.name, uploadError: null })
    setTimeout(() => upd({ stage: "review" }), 1400)
  }

  function confirmExtracted() {
    setS(p => ({
      ...p, stage: "form",
      form: { ...p.form, fullName: "Jordan Reyes", email: "jordan.reyes@example.com", phone: "+1 (555) 214-7783", currentLocation: "Tampa, FL", linkedin: "linkedin.com/in/jordanreyes", github: "github.com/jreyes", portfolio: "jordanreyes.com", school: "University of South Florida", major: "Computer Science", degree: "B.S.", gradMonth: "May", gradYear: "2027", workAuth: null, sponsorship: null, relocate: null, workMode: null, startDate: "", minSalary: "", desiredSalary: "", gender: null, race: null, veteran: null, disability: null, pronouns: "" },
      skills: ["Figma", "User research", "SQL", "Product analytics"],
      workHistory: [{ employer: "Brightline Labs", title: "Product Design Intern", startDate: "Jun 2025", endDate: "Aug 2025", description: "Redesigned the onboarding flow, ran usability tests with 12 participants." }],
    }))
  }

  // Chip helpers
  function addSkill() { const v = s.skillInput.trim(); if (!v) return; setS(p => ({ ...p, skills: [...p.skills, v], skillInput: "" })) }
  function removeSkill(i: number) { setS(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) })) }
  function addLocation() { const v = s.locationInput.trim(); if (!v) return; setS(p => ({ ...p, locations: [...p.locations, v], locationInput: "" })) }
  function removeLocation(i: number) { setS(p => ({ ...p, locations: p.locations.filter((_, idx) => idx !== i) })) }
  function addKeyword() { const v = s.keywordInput.trim(); if (!v) return; setS(p => ({ ...p, keywords: [...p.keywords, v], keywordInput: "" })) }
  function removeKeyword(i: number) { setS(p => ({ ...p, keywords: p.keywords.filter((_, idx) => idx !== i) })) }

  function addCompany() {
    if (!s.companyName.trim()) return
    setS(p => ({ ...p, companies: [...p.companies, { name: p.companyName, url: p.companyUrl }], companyName: "", companyUrl: "" }))
  }
  function removeCompany(i: number) { setS(p => ({ ...p, companies: p.companies.filter((_, idx) => idx !== i) })) }

  function addWorkEntry() { setS(p => ({ ...p, workHistory: [...p.workHistory, { employer: "", title: "", startDate: "", endDate: "", description: "" }] })) }
  function removeWorkEntry(i: number) { setS(p => ({ ...p, workHistory: p.workHistory.filter((_, idx) => idx !== i) })) }
  function updateWork(i: number, key: keyof WorkEntry, val: string) { setS(p => ({ ...p, workHistory: p.workHistory.map((w, idx) => idx === i ? { ...w, [key]: val } : w) })) }

  function addCover() { setS(p => ({ ...p, coverSamples: [...p.coverSamples, { label: "", text: "" }] })) }
  function addOutreach() { setS(p => ({ ...p, outreachSamples: [...p.outreachSamples, { label: "", text: "" }] })) }
  function updateCover(i: number, key: keyof SeedEntry, val: string) { setS(p => ({ ...p, coverSamples: p.coverSamples.map((r, idx) => idx === i ? { ...r, [key]: val } : r) })) }
  function updateOutreach(i: number, key: keyof SeedEntry, val: string) { setS(p => ({ ...p, outreachSamples: p.outreachSamples.map((r, idx) => idx === i ? { ...r, [key]: val } : r) })) }

  function goBack() { upd({ step: Math.max(0, s.step - 1) }) }

  async function goNext() {
    if (s.step === 0) {
      if (s.form.email.trim() && !EMAIL_RE.test(s.form.email.trim())) { upd({ emailError: true }); return }
      upd({ emailError: false })
    }
    if (s.step < 6) { upd({ step: s.step + 1 }); return }

    // Final step — save to Supabase
    setIsSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: s.form.fullName, email: s.form.email, phone: s.form.phone,
          linkedin_url: s.form.linkedin, github_url: s.form.github,
          skills: s.skills, work_history: s.workHistory,
          current_location: s.form.currentLocation, portfolio: s.form.portfolio,
          major: s.form.major, gpa: s.form.gpa, grad_month: s.form.gradMonth, grad_year: s.form.gradYear,
          education: s.form.school ? [{ institution: s.form.school, degree: s.form.degree, field: s.form.major, grad_month: s.form.gradMonth, grad_year: s.form.gradYear, gpa: s.form.gpa }] : null,
          work_auth: s.form.workAuth, sponsorship: s.form.sponsorship,
          relocate: s.form.relocate, work_mode: s.form.workMode, start_date: s.form.startDate,
          gender: s.form.gender, race: s.form.race, veteran: s.form.veteran,
          disability: s.form.disability, pronouns: s.form.pronouns,
        }),
      })

      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            locations: s.locations,
            seniority: s.seniority,
            salary_floor: s.form.minSalary ? Number(s.form.minSalary) : null,
            desired_salary: s.form.desiredSalary ? Number(s.form.desiredSalary) : null,
            role_keywords: s.keywords,
          },
          watchlist: s.companies.map(c => ({ company_name: c.name, careers_url: c.url })),
        }),
      })

      for (const c of s.coverSamples) {
        if (c.text.trim()) await fetch("/api/seeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "cover_letter_seeds", label: c.label, content: c.text }) })
      }
      for (const o of s.outreachSamples) {
        if (o.text.trim()) await fetch("/api/seeds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ table: "outreach_seeds", label: o.label, content: o.text }) })
      }

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      upd({ showSuccess: true })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const ctaStyle: React.CSSProperties = { background: "#024950", color: "#fff", border: "none", borderRadius: 20, padding: "13px 26px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }
  const backBtnStyle: React.CSSProperties = { background: "#EDF2F1", border: "none", borderRadius: 20, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(0,49,53,0.6)", cursor: "pointer", padding: "12px 22px" }
  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: 32, boxShadow: "0 1px 2px rgba(0,49,53,0.06)" }

  const EXTRACTED_ROWS = [
    { label: "Name", value: "Jordan Reyes" },
    { label: "Email", value: "jordan.reyes@example.com" },
    { label: "Phone", value: "+1 (555) 214-7783" },
    { label: "School", value: "University of South Florida" },
    { label: "Degree", value: "B.S. Computer Science, May 2027" },
    { label: "Skills", value: "Figma, User research, SQL, Product analytics" },
  ]

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: "100vh", width: "100%", background: "#F5F8F7", fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)", color: "#003135", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: s.stage !== "form" ? "center" : "flex-start", padding: "48px 24px", position: "relative", overflowX: "hidden", overflowY: "auto" }}>

        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(0,49,53,0.06) 1px, transparent 1px)", backgroundSize: "26px 26px", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, #000 40%, transparent 85%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, #000 40%, transparent 85%)" }} />

        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -220, right: -180, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.16) 0%, rgba(150,71,52,0) 70%)", pointerEvents: "none", filter: "blur(2px)" }} />
        <div style={{ position: "absolute", bottom: -260, left: -200, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(2,73,80,0.14) 0%, rgba(2,73,80,0) 70%)", pointerEvents: "none", filter: "blur(2px)" }} />
        <div style={{ position: "absolute", top: 120, left: "6%", width: 120, height: 120, border: "1px solid rgba(0,49,53,0.08)", borderRadius: 16, transform: "rotate(18deg)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 80, right: "8%", width: 90, height: 90, border: "1px solid rgba(150,71,52,0.18)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 780, position: "relative", zIndex: 1 }}>

          {/* ── Stage: Upload ── */}
          {s.stage === "upload" && (
            <div style={{ ...cardStyle, padding: 48, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(150,71,52,0.12)", color: "#964734", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 0L8 7m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 17v1a3 3 0 003 3h12a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Upload your resume</h1>
              <p style={{ fontSize: 14, color: "rgba(0,49,53,0.55)", margin: "0 0 28px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                We'll pull your details automatically so you can skip the typing. You can review and edit everything after.
              </p>
              <label style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "22px 40px", borderRadius: 10, border: "2px dashed rgba(150,71,52,0.32)", background: "rgba(150,71,52,0.06)", cursor: "pointer" }}>
                <input type="file" accept=".pdf,.doc,.docx" onChange={onFileSelected} style={{ display: "none" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#964734" }}>Choose file</span>
                <span style={{ fontSize: 12, color: "rgba(0,49,53,0.45)" }}>PDF, DOC, or DOCX — max 8 MB</span>
              </label>
              {s.uploadError && <p style={{ margin: "14px 0 0", fontSize: 13, fontWeight: 600, color: "#964734" }}>{s.uploadError}</p>}
              <p onClick={() => upd({ stage: "form" })} style={{ margin: "24px 0 0", fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.45)", cursor: "pointer" }}>
                Skip for now, I'll enter details manually
              </p>
            </div>
          )}

          {/* ── Stage: Extracting ── */}
          {s.stage === "extracting" && (
            <div style={{ ...cardStyle, padding: 56, textAlign: "center" }}>
              <div style={{ width: 36, height: 36, margin: "0 auto", borderRadius: "50%", border: "3px solid rgba(2,73,80,0.15)", borderTopColor: "#024950", animation: "ob-spin 0.8s linear infinite" }} />
              <h1 style={{ fontSize: 19, fontWeight: 700, margin: "22px 0 6px" }}>Reading your resume…</h1>
              <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: 0 }}>{s.resumeFileName}</p>
            </div>
          )}

          {/* ── Stage: Review extracted ── */}
          {s.stage === "review" && (
            <div style={{ ...cardStyle, padding: 36 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Here's what we found</h1>
              <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Extracted from {s.resumeFileName} — you'll be able to edit any of this next</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
                {EXTRACTED_ROWS.map((row, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 16px", background: "#F5F8F7", borderRadius: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", color: "rgba(0,49,53,0.5)", flexShrink: 0, width: 110 }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, textAlign: "right" }}>{row.value}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span onClick={() => upd({ stage: "upload" })} style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.45)", cursor: "pointer" }}>Start over</span>
                <button onClick={confirmExtracted} style={ctaStyle}>Looks good, continue →</button>
              </div>
            </div>
          )}

          {/* ── Stage: Form ── */}
          {s.stage === "form" && !s.showSuccess && (
            <>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Set up your profile</h1>
                <p style={{ fontSize: 14, color: "rgba(0,49,53,0.55)", margin: 0 }}>Configure the agent before it starts applying on your behalf</p>
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
                {TAB_LABELS.map((label, i) => {
                  const done = i < s.step; const active = i === s.step
                  return (
                    <div key={i} onClick={() => upd({ step: i })} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", borderRadius: 10, flex: 1, minWidth: 100, background: done ? "rgba(150,71,52,0.14)" : active ? "rgba(150,71,52,0.08)" : "#EDF2F1", color: done ? "#964734" : active ? "#7a3a29" : "rgba(0,49,53,0.55)", fontWeight: done ? 700 : 600, cursor: "pointer", fontSize: 13 }}>
                      {label}
                    </div>
                  )
                })}
              </div>

              {/* Form card */}
              <div style={cardStyle}>

                {/* ── Step 0: Personal ── */}
                {s.step === 0 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Personal info</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Used by the agent to fill ATS forms</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Full name</Label><input className="ob-input" type="text" placeholder="Jordan Reyes" value={s.form.fullName} onChange={e => updForm("fullName", e.target.value)} /></div>
                      <div>
                        <Label>Email</Label>
                        <input className="ob-input" type="email" placeholder="you@example.com" value={s.form.email} onChange={e => { updForm("email", e.target.value); upd({ emailError: false }) }} style={s.emailError ? { borderColor: "#964734" } : {}} />
                        {s.emailError && <p style={{ fontSize: 12, color: "#964734", margin: "6px 0 0" }}>Enter a valid email</p>}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Phone</Label><input className="ob-input" type="text" placeholder="+1 (555) 000-0000" value={s.form.phone} onChange={e => updForm("phone", e.target.value)} /></div>
                      <div><Label>Current location</Label><input className="ob-input" type="text" placeholder="Tampa, FL" value={s.form.currentLocation} onChange={e => updForm("currentLocation", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>LinkedIn URL</Label><input className="ob-input" type="text" placeholder="linkedin.com/in/…" value={s.form.linkedin} onChange={e => updForm("linkedin", e.target.value)} /></div>
                      <div><Label>GitHub URL</Label><input className="ob-input" type="text" placeholder="github.com/…" value={s.form.github} onChange={e => updForm("github", e.target.value)} /></div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <Label>Portfolio / personal website</Label>
                      <input className="ob-input" type="text" placeholder="jordanreyes.com" value={s.form.portfolio} onChange={e => updForm("portfolio", e.target.value)} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>School</Label><input className="ob-input" type="text" placeholder="University of…" value={s.form.school} onChange={e => updForm("school", e.target.value)} /></div>
                      <div><Label>Major / field of study</Label><input className="ob-input" type="text" placeholder="Computer Science" value={s.form.major} onChange={e => updForm("major", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Degree</Label><input className="ob-input" type="text" placeholder="B.S." value={s.form.degree} onChange={e => updForm("degree", e.target.value)} /></div>
                      <div><Label>GPA</Label><input className="ob-input" type="text" placeholder="3.8" value={s.form.gpa} onChange={e => updForm("gpa", e.target.value)} /></div>
                      <div><Label>Grad month</Label><input className="ob-input" type="text" placeholder="May" value={s.form.gradMonth} onChange={e => updForm("gradMonth", e.target.value)} /></div>
                      <div><Label>Grad year</Label><input className="ob-input" type="text" placeholder="2027" value={s.form.gradYear} onChange={e => updForm("gradYear", e.target.value)} /></div>
                    </div>

                    <div>
                      <Label>Skills</Label>
                      {s.skills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {s.skills.map((sk, i) => <Chip key={i} label={sk} onRemove={() => removeSkill(i)} />)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input className="ob-input" type="text" placeholder="Add skill, press Enter" value={s.skillInput} onChange={e => upd({ skillInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }} />
                        <PlusBtn onClick={addSkill} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Work Auth ── */}
                {s.step === 1 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Work authorization</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Asked on nearly every application — answer once, reuse everywhere</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Are you legally authorized to work in the US?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.workAuth === o} onClick={() => toggleForm("workAuth", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Will you now or in the future require visa sponsorship?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.sponsorship === o} onClick={() => toggleForm("sponsorship", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Willing to relocate?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.relocate === o} onClick={() => toggleForm("relocate", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Work mode preference</Label>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {WORK_MODE_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.workMode === o} onClick={() => toggleForm("workMode", o)} />)}
                      </div>
                    </div>

                    <div>
                      <Label>Available start date</Label>
                      <input className="ob-input" type="text" placeholder="Immediately, or a date" value={s.form.startDate} onChange={e => updForm("startDate", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Work History ── */}
                {s.step === 2 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Work history</h2>
                      <span onClick={addWorkEntry} style={{ fontSize: 13, fontWeight: 600, color: "#024950", cursor: "pointer" }}>+ Add position</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>Structured so the agent can fill multi-row work history sections</p>
                    {s.workHistory.map((job, i) => (
                      <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 18, marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                          <span onClick={() => removeWorkEntry(i)} style={{ cursor: "pointer", opacity: 0.45, fontSize: 14 }}>Remove</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                          <div><Label>Employer</Label><input className="ob-input" type="text" placeholder="Acme Inc." value={job.employer} onChange={e => updateWork(i, "employer", e.target.value)} /></div>
                          <div><Label>Job title</Label><input className="ob-input" type="text" placeholder="Product Designer" value={job.title} onChange={e => updateWork(i, "title", e.target.value)} /></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                          <div><Label>Start date</Label><input className="ob-input" type="text" placeholder="Jun 2022" value={job.startDate} onChange={e => updateWork(i, "startDate", e.target.value)} /></div>
                          <div><Label>End date</Label><input className="ob-input" type="text" placeholder="Present" value={job.endDate} onChange={e => updateWork(i, "endDate", e.target.value)} /></div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea className="ob-textarea" placeholder="What you did in this role…" value={job.description} onChange={e => updateWork(i, "description", e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Step 3: Preferences ── */}
                {s.step === 3 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Job preferences</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Controls which jobs the agent pursues</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Target locations</Label>
                      {s.locations.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {s.locations.map((loc, i) => <Chip key={i} label={loc} onRemove={() => removeLocation(i)} />)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input className="ob-input" type="text" placeholder="San Francisco, CA" value={s.locationInput} onChange={e => upd({ locationInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addLocation() } }} />
                        <PlusBtn onClick={addLocation} />
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Seniority levels</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {SENIORITY_LEVELS.map(o => <Pill key={o} label={o} selected={s.seniority.includes(o)} onClick={() => toggleSeniority(o)} />)}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                      <div><Label>Minimum salary (USD/yr)</Label><input className="ob-input" type="text" placeholder="80000" value={s.form.minSalary} onChange={e => updForm("minSalary", e.target.value)} /></div>
                      <div><Label>Desired salary (USD/yr)</Label><input className="ob-input" type="text" placeholder="110000" value={s.form.desiredSalary} onChange={e => updForm("desiredSalary", e.target.value)} /></div>
                    </div>

                    <div>
                      <Label>Role keywords</Label>
                      {s.keywords.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {s.keywords.map((kw, i) => <Chip key={i} label={kw} onRemove={() => removeKeyword(i)} />)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input className="ob-input" type="text" placeholder="Software Engineer, SWE, Backend" value={s.keywordInput} onChange={e => upd({ keywordInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword() } }} />
                        <PlusBtn onClick={addKeyword} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Watchlist ── */}
                {s.step === 4 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Company watchlist</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Companies to monitor closely — agent checks these every run</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Company name</Label><input className="ob-input" type="text" placeholder="Stripe" value={s.companyName} onChange={e => upd({ companyName: e.target.value })} /></div>
                      <div><Label>Careers page URL</Label><input className="ob-input" type="text" placeholder="https://stripe.com/jobs" value={s.companyUrl} onChange={e => upd({ companyUrl: e.target.value })} /></div>
                    </div>

                    <button onClick={addCompany} style={{ padding: "11px 20px", borderRadius: 20, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>+ Add company</button>

                    {s.companies.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
                        {s.companies.map((co, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#F5F8F7", borderRadius: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{co.name}</span>
                            <span style={{ fontSize: 12, color: "rgba(0,49,53,0.5)" }}>{co.url}</span>
                            <span onClick={() => removeCompany(i)} style={{ cursor: "pointer", opacity: 0.5, fontSize: 14 }}>×</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ textAlign: "center", fontSize: 13, color: "rgba(0,49,53,0.45)", margin: "24px 0 0" }}>No companies added yet — you can skip this and add later in Settings</p>
                    )}
                  </div>
                )}

                {/* ── Step 5: Demographics ── */}
                {s.step === 5 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Demographic info</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Required by law on most Greenhouse/Lever forms — answering is always voluntary and never affects scoring</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Gender</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {GENDER_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.gender === o} onClick={() => toggleForm("gender", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Race / ethnicity</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {RACE_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.race === o} onClick={() => toggleForm("race", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Veteran status</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {VETERAN_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.veteran === o} onClick={() => toggleForm("veteran", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Disability status</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {DISABILITY_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.disability === o} onClick={() => toggleForm("disability", o)} />)}
                      </div>
                    </div>

                    <div>
                      <Label>Pronouns</Label>
                      <input className="ob-input" type="text" placeholder="she/her, he/him, they/them…" value={s.form.pronouns} onChange={e => updForm("pronouns", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ── Step 6: Tone Samples ── */}
                {s.step === 6 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Tone samples</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Paste real cover letters and outreach you've written — the agent matches your voice</p>

                    <div style={{ marginBottom: 24 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Cover letter samples</span>
                        <span onClick={addCover} style={{ fontSize: 13, fontWeight: 600, color: "#024950", cursor: "pointer" }}>+ Add another</span>
                      </div>
                      {s.coverSamples.map((sample, i) => (
                        <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                          <input className="ob-input" type="text" placeholder='Label (e.g. "Google cover letter")' value={sample.label} onChange={e => updateCover(i, "label", e.target.value)} />
                          <textarea className="ob-textarea" placeholder="Paste your cover letter here…" value={sample.text} onChange={e => updateCover(i, "text", e.target.value)} />
                        </div>
                      ))}
                    </div>

                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>Cold outreach samples</span>
                        <span onClick={addOutreach} style={{ fontSize: 13, fontWeight: 600, color: "#024950", cursor: "pointer" }}>+ Add another</span>
                      </div>
                      {s.outreachSamples.map((sample, i) => (
                        <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                          <input className="ob-input" type="text" placeholder='Label (e.g. "Engineering recruiter email")' value={sample.label} onChange={e => updateOutreach(i, "label", e.target.value)} />
                          <textarea className="ob-textarea" placeholder="Paste your outreach message here…" value={sample.text} onChange={e => updateOutreach(i, "text", e.target.value)} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>

              {/* Nav row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                {s.step > 0 ? <button onClick={goBack} style={backBtnStyle}>← Back</button> : <span />}
                <button onClick={goNext} disabled={isSaving} style={{ ...ctaStyle, opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? "Saving…" : s.step === 6 ? "Finish setup →" : "Next →"}
                </button>
              </div>

              {(s.step >= 4) && (
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,49,53,0.4)", margin: "16px 0 0" }}>
                  All fields optional — you can update everything later in Settings
                </p>
              )}
            </>
          )}

          {/* ── Success ── */}
          {s.showSuccess && (
            <div style={{ ...cardStyle, padding: 40 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#024950", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, color: "#fff", fontSize: 20 }}>✓</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 10px" }}>You're all set</h1>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(0,49,53,0.55)", margin: "0 0 28px" }}>Your profile is ready. You can update any of this later in Settings.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => { try { localStorage.removeItem(STORAGE_KEY) } catch {}; upd({ ...INITIAL_STATE }) }} style={backBtnStyle}>Start over</button>
                <button onClick={() => router.push("/dashboard")} style={ctaStyle}>Go to dashboard →</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
