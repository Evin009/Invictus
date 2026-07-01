"use client"

import { useState } from "react"
import { Plus, Trash, UploadSimple } from "@phosphor-icons/react"
import type { UserProfile } from "@/lib/types"

interface Props { profile: UserProfile | null }

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[13px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>{children}</h2>
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[12px] font-medium block mb-1.5" style={{ color: "var(--foreground)" }}>{children}</label>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
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
      className="w-full px-3 py-2 text-[13px] rounded-lg outline-none transition-premium"
      style={{
        border: `1px solid ${focused ? "var(--primary)" : "var(--border)"}`,
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
        boxShadow: focused ? "0 0 0 3px oklch(0.560 0.115 200 / 0.10)" : "none",
      }}
    />
  )
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-6"
      style={{ border: "1px solid var(--border)", backgroundColor: "var(--card)", boxShadow: "var(--shadow-sm)" }}
    >
      {children}
    </section>
  )
}

export function ProfileForm({ profile }: Props) {
  const [fullName,    setFullName]    = useState(profile?.full_name    ?? "")
  const [email,       setEmail]       = useState(profile?.email        ?? "")
  const [phone,       setPhone]       = useState(profile?.phone        ?? "")
  const [linkedinUrl, setLinkedinUrl] = useState(profile?.linkedin_url ?? "")
  const [githubUrl,   setGithubUrl]   = useState(profile?.github_url   ?? "")
  const [skills,      setSkills]      = useState((profile?.skills ?? []).join(", "))
  const [saving,      setSaving]      = useState(false)
  const [saveState,   setSaveState]   = useState<"idle" | "saved" | "error">("idle")

  // Resume list (derived from profile — display only for now)
  const [newSkill, setNewSkill] = useState("")

  async function saveProfile() {
    setSaving(true)
    setSaveState("idle")
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name:    fullName || null,
          email:        email || null,
          phone:        phone || null,
          linkedin_url: linkedinUrl || null,
          github_url:   githubUrl || null,
          skills:       skills.split(",").map((s) => s.trim()).filter(Boolean),
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

  function addSkill() {
    const s = newSkill.trim()
    if (!s) return
    const current = skills.split(",").map((x) => x.trim()).filter(Boolean)
    if (!current.includes(s)) setSkills([...current, s].join(", "))
    setNewSkill("")
  }

  function removeSkill(sk: string) {
    setSkills(skills.split(",").map((x) => x.trim()).filter((x) => x && x !== sk).join(", "))
  }

  const skillList = skills.split(",").map((s) => s.trim()).filter(Boolean)

  return (
    <div className="space-y-6 max-w-2xl animate-fade-up">

      {/* Avatar + identity */}
      <Section>
        <div className="flex items-start gap-5 mb-6">
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center text-[1.375rem] font-bold"
            style={{
              background: "oklch(0.88 0.055 200)",
              color: "oklch(0.30 0.090 200)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {fullName ? fullName.slice(0, 2).toUpperCase() : "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
              {fullName || "Your Name"}
            </p>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {email || "your@email.com"}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
              This data is used by the agent to auto-fill ATS application forms.
            </p>
          </div>
        </div>

        <div className="mb-4">
          <SectionTitle>Personal Information</SectionTitle>
          <p className="text-[12px] mt-0.5 mb-5" style={{ color: "var(--muted-foreground)" }}>
            Used to fill name, email, and contact fields on job applications.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Full name">
              <Input value={fullName} onChange={setFullName} placeholder="Jane Smith" />
            </Field>
          </div>
          <Field label="Email">
            <Input value={email} onChange={setEmail} placeholder="jane@example.com" type="email" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={setPhone} placeholder="+1 (555) 000-0000" type="tel" />
          </Field>
          <Field label="LinkedIn URL">
            <Input value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/..." />
          </Field>
          <Field label="GitHub URL">
            <Input value={githubUrl} onChange={setGithubUrl} placeholder="https://github.com/..." />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              backgroundColor: "var(--foreground)",
              color: "var(--background)",
              opacity: saving ? 0.55 : 1,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving…" : "Save profile"}
          </button>
          {saveState === "saved" && (
            <span className="text-[12px] font-medium animate-fade-in" style={{ color: "oklch(0.290 0.120 145)" }}>
              Profile updated
            </span>
          )}
          {saveState === "error" && (
            <span className="text-[12px] font-medium animate-fade-in" style={{ color: "oklch(0.350 0.140 15)" }}>
              Something went wrong
            </span>
          )}
        </div>
      </Section>

      {/* Skills */}
      <Section>
        <div className="mb-5">
          <SectionTitle>Skills</SectionTitle>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            Used by the agent to select relevant bullets during resume tailoring.
          </p>
        </div>

        {/* Skill chips */}
        {skillList.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skillList.map((sk) => (
              <span
                key={sk}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-[12px] font-medium transition-premium"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              >
                {sk}
                <button
                  onClick={() => removeSkill(sk)}
                  className="flex items-center justify-center w-4 h-4 rounded-full transition-premium"
                  style={{ color: "var(--muted-foreground)" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "oklch(0.350 0.140 15)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)")}
                >
                  <Trash size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }}
            placeholder="e.g. TypeScript, Python, AWS…"
            className="flex-1 px-3 py-2 text-[13px] rounded-lg outline-none transition-premium"
            style={{ border: "1px solid var(--border)", backgroundColor: "var(--background)", color: "var(--foreground)" }}
          />
          <button
            onClick={addSkill}
            disabled={!newSkill.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium transition-premium active:scale-[0.98]"
            style={{
              backgroundColor: newSkill.trim() ? "var(--primary)" : "var(--muted)",
              color: newSkill.trim() ? "var(--primary-foreground)" : "var(--muted-foreground)",
              cursor: newSkill.trim() ? "pointer" : "not-allowed",
            }}
          >
            <Plus size={13} weight="bold" />
            Add
          </button>
        </div>
      </Section>

      {/* Resumes */}
      <Section>
        <div className="mb-5">
          <SectionTitle>Resumes</SectionTitle>
          <p className="text-[12px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
            The agent uses <code className="text-[11px] px-1 py-0.5 rounded" style={{ backgroundColor: "var(--muted)" }}>resumes/</code> directory on the server.
            PDFs generated per application are tracked in the Applications table.
          </p>
        </div>

        <div
          className="rounded-xl p-8 text-center"
          style={{ border: "2px dashed var(--border)", backgroundColor: "var(--muted)" }}
        >
          <div
            className="w-10 h-10 rounded-2xl mx-auto mb-3 flex items-center justify-center"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
          >
            <UploadSimple size={16} style={{ color: "var(--muted-foreground)" }} />
          </div>
          <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--foreground)" }}>
            Resumes live on the server
          </p>
          <p className="text-[12px] max-w-[30ch] mx-auto" style={{ color: "var(--muted-foreground)" }}>
            Place <code className="text-[11px]">.tex</code> files in the <code className="text-[11px]">resumes/</code> directory on your droplet. The agent tailors them per application automatically.
          </p>
        </div>
      </Section>
    </div>
  )
}
