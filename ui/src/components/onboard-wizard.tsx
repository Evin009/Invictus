"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  User, Briefcase, Buildings, Article,
  Plus, X, ArrowRight, ArrowLeft, Check,
} from "@phosphor-icons/react"

const STEPS = [
  { id: 1, label: "Personal", icon: User },
  { id: 2, label: "Preferences", icon: Briefcase },
  { id: 3, label: "Watchlist", icon: Buildings },
  { id: 4, label: "Tone Samples", icon: Article },
]

type WatchlistEntry = { company_name: string; careers_url: string }
type Seed = { label: string; content: string }

function Tag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium"
      style={{ backgroundColor: "oklch(0.560 0.115 200 / 0.12)", color: "oklch(0.480 0.110 200)" }}
    >
      {label}
      <button onClick={onRemove} style={{ lineHeight: 0 }}>
        <X size={10} weight="bold" />
      </button>
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <label className="text-[12px] font-medium" style={{ color: "var(--muted-foreground)" }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  backgroundColor: "var(--muted)",
  border: "1px solid var(--border)",
  color: "var(--foreground)",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "13px",
  outline: "none",
  width: "100%",
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={inputStyle}
      onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.560 0.115 200)"; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; props.onBlur?.(e) }}
    />
  )
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, minHeight: "110px", resize: "vertical" } as React.CSSProperties}
      onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.560 0.115 200)"; props.onFocus?.(e) }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; props.onBlur?.(e) }}
    />
  )
}

export function OnboardWizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1 — Personal
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [linkedin, setLinkedin] = useState("")
  const [github, setGithub] = useState("")
  const [school, setSchool] = useState("")
  const [degree, setDegree] = useState("")
  const [gradYear, setGradYear] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("")

  // Step 2 — Preferences
  const [locations, setLocations] = useState<string[]>([])
  const [locInput, setLocInput] = useState("")
  const [seniority, setSeniority] = useState<string[]>([])
  const [salaryFloor, setSalaryFloor] = useState("")
  const [keywords, setKeywords] = useState<string[]>([])
  const [kwInput, setKwInput] = useState("")

  // Step 3 — Watchlist
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([])
  const [wCompany, setWCompany] = useState("")
  const [wUrl, setWUrl] = useState("")

  // Step 4 — Seeds
  const [clSeeds, setClSeeds] = useState<Seed[]>([{ label: "", content: "" }])
  const [outSeeds, setOutSeeds] = useState<Seed[]>([{ label: "", content: "" }])

  function addTag(list: string[], setList: (v: string[]) => void, val: string, setVal: (v: string) => void) {
    const trimmed = val.trim()
    if (trimmed && !list.includes(trimmed)) setList([...list, trimmed])
    setVal("")
  }

  const SENIORITY_OPTIONS = ["Internship", "Entry Level", "Mid Level", "Senior", "Lead", "Staff"]

  async function finish() {
    setSaving(true)
    try {
      await Promise.all([
        fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName, email, phone,
            linkedin_url: linkedin, github_url: github,
            education: [{ institution: school, degree, graduation_year: gradYear }],
            skills,
          }),
        }),
        fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            preferences: {
              locations,
              seniority: seniority,
              salary_floor: salaryFloor ? parseInt(salaryFloor) : null,
              role_keywords: keywords,
            },
            watchlist: watchlist.map((w) => ({ company_name: w.company_name, careers_url: w.careers_url })),
          }),
        }),
        ...clSeeds.filter((s) => s.label && s.content).map((s) =>
          fetch("/api/seeds?table=cover_letter_seeds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s),
          })
        ),
        ...outSeeds.filter((s) => s.label && s.content).map((s) =>
          fetch("/api/seeds?table=outreach_seeds", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s),
          })
        ),
      ])
      router.push("/dashboard")
    } catch {
      setSaving(false)
    }
  }

  return (
    <div style={{ width: "100%", maxWidth: "560px" }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div
          className="shrink-0 rounded-xl flex items-center justify-center p-[2px]"
          style={{
            width: "34px", height: "34px",
            background: "linear-gradient(145deg, oklch(0.660 0.125 200), oklch(0.480 0.100 210))",
          }}
        >
          <div
            className="w-full h-full rounded-[calc(0.75rem-2px)] flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, oklch(0.600 0.115 200), oklch(0.455 0.095 212))" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
                stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25"
                stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
        </div>
        <div>
          <span className="text-[17px] font-semibold tracking-tight block" style={{ color: "var(--foreground)" }}>Set up Invictus</span>
          <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>Configure the agent before it starts running</span>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex gap-2 mb-6">
        {STEPS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => id < step && setStep(id)}
            className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-[11px] font-medium transition-premium"
            style={{
              backgroundColor: step === id
                ? "oklch(0.560 0.115 200 / 0.12)"
                : id < step ? "oklch(0.560 0.115 200 / 0.06)" : "var(--muted)",
              color: step === id
                ? "oklch(0.480 0.110 200)"
                : id < step ? "oklch(0.560 0.115 200)" : "var(--muted-foreground)",
              border: step === id ? "1px solid oklch(0.560 0.115 200 / 0.25)" : "1px solid transparent",
              cursor: id < step ? "pointer" : "default",
            }}
          >
            {id < step
              ? <Check size={14} weight="bold" style={{ color: "oklch(0.560 0.115 200)" }} />
              : <Icon size={14} weight={step === id ? "fill" : "duotone"} />
            }
            {label}
          </button>
        ))}
      </div>

      {/* Card */}
      <div className="bezel-shell">
        <div className="bezel-core" style={{ padding: "28px" }}>

          {/* ── Step 1: Personal ── */}
          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>Personal info</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Used by the agent to fill ATS forms</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full name"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Evin Bento" /></Field>
                <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
                <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (813) 000-0000" /></Field>
                <Field label="LinkedIn URL"><Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/..." /></Field>
                <Field label="GitHub URL"><Input value={github} onChange={(e) => setGithub(e.target.value)} placeholder="github.com/..." /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="School"><Input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="University of South Florida" /></Field>
                <Field label="Degree"><Input value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="B.S. Computer Science" /></Field>
                <Field label="Grad year"><Input value={gradYear} onChange={(e) => setGradYear(e.target.value)} placeholder="2027" /></Field>
              </div>
              <Field label="Skills">
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    placeholder="Add skill, press Enter"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(skills, setSkills, skillInput, setSkillInput) } }}
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button
                    onClick={() => addTag(skills, setSkills, skillInput, setSkillInput)}
                    className="rounded-xl px-3 flex items-center justify-center"
                    style={{ backgroundColor: "oklch(0.560 0.115 200 / 0.12)", color: "oklch(0.480 0.110 200)" }}
                  ><Plus size={14} /></button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((s) => <Tag key={s} label={s} onRemove={() => setSkills(skills.filter((x) => x !== s))} />)}
                  </div>
                )}
              </Field>
            </div>
          )}

          {/* ── Step 2: Preferences ── */}
          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>Job preferences</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Controls which jobs the agent pursues</p>
              </div>
              <Field label="Target locations">
                <div className="flex gap-2">
                  <Input value={locInput} onChange={(e) => setLocInput(e.target.value)} placeholder="San Francisco, CA" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(locations, setLocations, locInput, setLocInput) } }} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => addTag(locations, setLocations, locInput, setLocInput)} className="rounded-xl px-3" style={{ backgroundColor: "oklch(0.560 0.115 200 / 0.12)", color: "oklch(0.480 0.110 200)" }}><Plus size={14} /></button>
                </div>
                {locations.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{locations.map((l) => <Tag key={l} label={l} onRemove={() => setLocations(locations.filter((x) => x !== l))} />)}</div>}
              </Field>
              <Field label="Seniority levels">
                <div className="flex flex-wrap gap-2">
                  {SENIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSeniority(seniority.includes(opt) ? seniority.filter((x) => x !== opt) : [...seniority, opt])}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium transition-premium"
                      style={{
                        backgroundColor: seniority.includes(opt) ? "oklch(0.560 0.115 200 / 0.12)" : "var(--muted)",
                        color: seniority.includes(opt) ? "oklch(0.480 0.110 200)" : "var(--muted-foreground)",
                        border: seniority.includes(opt) ? "1px solid oklch(0.560 0.115 200 / 0.25)" : "1px solid transparent",
                      }}
                    >{opt}</button>
                  ))}
                </div>
              </Field>
              <Field label="Minimum salary (USD/yr)">
                <Input type="number" value={salaryFloor} onChange={(e) => setSalaryFloor(e.target.value)} placeholder="80000" />
              </Field>
              <Field label="Role keywords">
                <div className="flex gap-2">
                  <Input value={kwInput} onChange={(e) => setKwInput(e.target.value)} placeholder="Software Engineer, SWE, Backend" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(keywords, setKeywords, kwInput, setKwInput) } }} style={{ ...inputStyle, flex: 1 }} />
                  <button onClick={() => addTag(keywords, setKeywords, kwInput, setKwInput)} className="rounded-xl px-3" style={{ backgroundColor: "oklch(0.560 0.115 200 / 0.12)", color: "oklch(0.480 0.110 200)" }}><Plus size={14} /></button>
                </div>
                {keywords.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{keywords.map((k) => <Tag key={k} label={k} onRemove={() => setKeywords(keywords.filter((x) => x !== k))} />)}</div>}
              </Field>
            </div>
          )}

          {/* ── Step 3: Watchlist ── */}
          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>Company watchlist</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Companies to monitor closely — agent checks these every run</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Company name"><Input value={wCompany} onChange={(e) => setWCompany(e.target.value)} placeholder="Stripe" /></Field>
                <Field label="Careers page URL"><Input value={wUrl} onChange={(e) => setWUrl(e.target.value)} placeholder="https://stripe.com/jobs" /></Field>
              </div>
              <button
                onClick={() => {
                  if (wCompany.trim() && wUrl.trim()) {
                    setWatchlist([...watchlist, { company_name: wCompany.trim(), careers_url: wUrl.trim() }])
                    setWCompany(""); setWUrl("")
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium w-fit transition-premium"
                style={{ backgroundColor: "oklch(0.560 0.115 200 / 0.12)", color: "oklch(0.480 0.110 200)" }}
              >
                <Plus size={13} /> Add company
              </button>
              {watchlist.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {watchlist.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-xl"
                      style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)" }}
                    >
                      <div>
                        <span className="text-[13px] font-medium block" style={{ color: "var(--foreground)" }}>{w.company_name}</span>
                        <span className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>{w.careers_url}</span>
                      </div>
                      <button onClick={() => setWatchlist(watchlist.filter((_, j) => j !== i))} style={{ color: "var(--muted-foreground)" }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {watchlist.length === 0 && (
                <p className="text-[12px] text-center py-4" style={{ color: "var(--muted-foreground)" }}>
                  No companies added yet — you can skip this and add later in Settings
                </p>
              )}
            </div>
          )}

          {/* ── Step 4: Tone Samples ── */}
          {step === 4 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div>
                <h2 className="text-[15px] font-semibold" style={{ color: "var(--foreground)" }}>Tone samples</h2>
                <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Paste real cover letters and outreach you've written — the agent matches your voice</p>
              </div>

              {/* Cover letters */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>Cover letter samples</span>
                  <button onClick={() => setClSeeds([...clSeeds, { label: "", content: "" }])} className="flex items-center gap-1.5 text-[12px]" style={{ color: "oklch(0.560 0.115 200)" }}>
                    <Plus size={12} /> Add another
                  </button>
                </div>
                {clSeeds.map((s, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="flex items-center gap-2">
                      <Input value={s.label} onChange={(e) => { const n = [...clSeeds]; n[i].label = e.target.value; setClSeeds(n) }} placeholder={`Label (e.g. "Google cover letter")`} style={{ ...inputStyle, flex: 1 }} />
                      {clSeeds.length > 1 && <button onClick={() => setClSeeds(clSeeds.filter((_, j) => j !== i))} style={{ color: "var(--muted-foreground)" }}><X size={13} /></button>}
                    </div>
                    <Textarea value={s.content} onChange={(e) => { const n = [...clSeeds]; n[i].content = e.target.value; setClSeeds(n) }} placeholder="Paste your cover letter here..." />
                  </div>
                ))}
              </div>

              {/* Outreach */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium" style={{ color: "var(--foreground)" }}>Cold outreach samples</span>
                  <button onClick={() => setOutSeeds([...outSeeds, { label: "", content: "" }])} className="flex items-center gap-1.5 text-[12px]" style={{ color: "oklch(0.560 0.115 200)" }}>
                    <Plus size={12} /> Add another
                  </button>
                </div>
                {outSeeds.map((s, i) => (
                  <div key={i} className="rounded-xl p-3" style={{ backgroundColor: "var(--muted)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="flex items-center gap-2">
                      <Input value={s.label} onChange={(e) => { const n = [...outSeeds]; n[i].label = e.target.value; setOutSeeds(n) }} placeholder={`Label (e.g. "Engineering recruiter email")`} style={{ ...inputStyle, flex: 1 }} />
                      {outSeeds.length > 1 && <button onClick={() => setOutSeeds(outSeeds.filter((_, j) => j !== i))} style={{ color: "var(--muted-foreground)" }}><X size={13} /></button>}
                    </div>
                    <Textarea value={s.content} onChange={(e) => { const n = [...outSeeds]; n[i].content = e.target.value; setOutSeeds(n) }} placeholder="Paste your outreach message here..." />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between mt-4">
        {step > 1
          ? <button onClick={() => setStep(step - 1)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-medium transition-premium" style={{ backgroundColor: "var(--muted)", color: "var(--foreground)" }}>
              <ArrowLeft size={13} /> Back
            </button>
          : <div />
        }
        {step < 4
          ? <button onClick={() => setStep(step + 1)} className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-premium" style={{ backgroundColor: "oklch(0.560 0.115 200)", color: "white" }}>
              Next <ArrowRight size={13} />
            </button>
          : <button onClick={finish} disabled={saving} className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold transition-premium active:scale-[0.98]" style={{ backgroundColor: "oklch(0.560 0.115 200)", color: "white", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Saving..." : <><Check size={13} /> Finish setup</>}
            </button>
        }
      </div>
      <p className="text-center text-[11px] mt-3" style={{ color: "var(--muted-foreground)" }}>
        All fields optional — you can update everything later in Settings
      </p>
    </div>
  )
}
