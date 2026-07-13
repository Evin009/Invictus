"use client"

import { useEffect, useRef, useState } from "react"

const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
}
const TEXTAREA: React.CSSProperties = {
  width: "100%", minHeight: 420, padding: "16px 18px", fontSize: 13, lineHeight: 1.6,
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  borderRadius: 10, border: "1px solid rgba(0,49,53,0.14)", outline: "none",
  background: "#F5F8F7", color: "#003135", resize: "vertical",
}
const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%", animation: "res-shimmer 1.4s ease infinite", borderRadius: 8,
}
const CHIP: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", padding: "5px 12px",
  background: "rgba(150,71,52,0.1)", color: "#964734", borderRadius: 20, fontSize: 12, fontWeight: 600,
}

interface StructuredEducation {
  school: string; degree: string; major: string; gpa: string; gradMonth: string; gradYear: string
}
interface StructuredEntry {
  employer: string; title: string; startDate: string; endDate: string; bullets: string[]
}
interface StructuredResume {
  fullName: string; email: string; phone: string; linkedin: string; github: string
  portfolio: string; currentLocation: string
  education: StructuredEducation
  skills: string[]
  experience: StructuredEntry[]
}

interface ResumeDoc {
  id: string
  tex_content: string
  structured: StructuredResume | null
  source_pdf_path: string | null
  updated_at: string | null
}

interface RecentSubmission {
  title: string | null
  company: string | null
  submittedAt: string | null
  url: string | null
}

function timeAgo(iso: string | null) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Invictus-branded resume view, rendered from structured data (not the raw
// uploaded file, not raw LaTeX) — a letterhead built to match the rest of
// the app instead of embedding a generic PDF viewer.
function InvictusResumeView({ resume }: { resume: StructuredResume }) {
  const contactParts = [resume.email, resume.phone, resume.linkedin, resume.github, resume.portfolio, resume.currentLocation].filter(Boolean)
  const edu = resume.education
  const eduLine = [edu?.degree, edu?.major].filter(Boolean).join(" in ")
  const eduDate = [edu?.gradMonth, edu?.gradYear].filter(Boolean).join(" ")

  return (
    <div style={{
      background: "#fff", border: "1px solid rgba(0,49,53,0.1)", borderRadius: 14,
      padding: "40px 44px", boxShadow: "0 1px 2px rgba(0,49,53,0.04)",
    }}>
      {/* Masthead */}
      <div style={{ textAlign: "center", marginBottom: 28, paddingBottom: 24, borderBottom: "2px solid #003135" }}>
        <p style={{ margin: "0 0 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "#0FA4AF", textTransform: "uppercase" }}>
          Invictus
        </p>
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 700, color: "#003135", letterSpacing: "-0.01em" }}>
          {resume.fullName || "Your Name"}
        </h1>
        {contactParts.length > 0 && (
          <p style={{ margin: 0, fontSize: 12.5, color: "rgba(0,49,53,0.55)" }}>
            {contactParts.join("  ·  ")}
          </p>
        )}
      </div>

      {/* Education */}
      {edu?.school && (
        <div style={{ marginBottom: 26 }}>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#964734", textTransform: "uppercase" }}>
            Education
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
            <div>
              <p style={{ margin: "0 0 2px", fontSize: 14.5, fontWeight: 700, color: "#003135" }}>{edu.school}</p>
              <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.6)" }}>
                {eduLine}{edu.gpa ? ` · GPA ${edu.gpa}` : ""}
              </p>
            </div>
            {eduDate && <p style={{ margin: 0, fontSize: 12.5, color: "rgba(0,49,53,0.45)", flexShrink: 0 }}>{eduDate}</p>}
          </div>
        </div>
      )}

      {/* Experience */}
      {resume.experience?.length > 0 && (
        <div style={{ marginBottom: 26 }}>
          <p style={{ margin: "0 0 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#964734", textTransform: "uppercase" }}>
            Experience
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {resume.experience.map((e, i) => {
              const header = [e.title, e.employer].filter(Boolean).join(", ")
              const dates = [e.startDate, e.endDate].filter(Boolean).join(" – ")
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#003135" }}>{header}</p>
                    {dates && <p style={{ margin: 0, fontSize: 12.5, color: "rgba(0,49,53,0.45)", flexShrink: 0 }}>{dates}</p>}
                  </div>
                  {e.bullets?.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {e.bullets.map((b, j) => (
                        <li key={j} style={{ fontSize: 13, color: "rgba(0,49,53,0.75)", lineHeight: 1.6, marginBottom: 3 }}>{b}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skills */}
      {resume.skills?.length > 0 && (
        <div>
          <p style={{ margin: "0 0 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "#964734", textTransform: "uppercase" }}>
            Skills
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {resume.skills.map((s, i) => <span key={i} style={CHIP}>{s}</span>)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResumePage() {
  const [loading, setLoading] = useState(true)
  const [texContent, setTexContent] = useState("")
  const [structured, setStructured] = useState<StructuredResume | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])
  const [hasDoc, setHasDoc] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function loadResume() {
    return fetch("/api/resume")
      .then(r => r.json())
      .then(d => {
        const resume: ResumeDoc | null = d?.resume ?? null
        setTexContent(resume?.tex_content ?? "")
        setStructured(resume?.structured ?? null)
        setHasDoc(!!resume)
        setSourceUrl(d?.sourceUrl ?? null)
        setRecentSubmissions(Array.isArray(d?.recentSubmissions) ? d.recentSubmissions : [])
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadResume().finally(() => setLoading(false))
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const profile = await fetch("/api/profile").then(r => r.json()).catch(() => ({}))
      const education = Array.isArray(profile?.education) ? profile.education[0] : null

      const fd = new FormData()
      fd.append("file", file)
      fd.append("data", JSON.stringify({
        fullName: profile?.full_name ?? "",
        email: profile?.email ?? "",
        phone: profile?.phone ?? "",
        linkedin: profile?.linkedin_url ?? "",
        github: profile?.github_url ?? "",
        portfolio: profile?.portfolio ?? "",
        currentLocation: profile?.current_location ?? "",
        school: education?.institution ?? education?.school ?? "",
        degree: education?.degree ?? "",
        major: profile?.major ?? education?.field ?? "",
        gpa: profile?.gpa ?? "",
        gradMonth: profile?.grad_month ?? "",
        gradYear: profile?.grad_year ?? "",
        skills: Array.isArray(profile?.skills) ? profile.skills : [],
        workHistory: Array.isArray(profile?.work_history) ? profile.work_history : [],
      }))

      const res = await fetch("/api/generate-resume-tex", { method: "POST", body: fd })
      if (!res.ok) throw new Error()
      await loadResume()
      flash(`Uploaded ${file.name}`)
    } catch {
      flash("Couldn't process that file — try again")
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/resume", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tex_content: texContent }),
      })
      if (!res.ok) throw new Error()
      setHasDoc(true)
      flash("Saved — note: this only changes what the agent submits, not the preview above")
    } catch {
      flash("Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, paddingBottom: 40 }}>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes res-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }" }} />

      {toast && (
        <div style={{
          position: "fixed", top: 24, right: 24, maxWidth: 320, display: "flex", alignItems: "center", gap: 10,
          background: "#fff", color: "#003135", borderRadius: 12, padding: "13px 18px",
          boxShadow: "0 12px 28px rgba(0,49,53,0.18)", border: "1px solid rgba(15,164,175,0.3)",
          fontSize: 13, fontWeight: 600, zIndex: 50,
        }}>
          {toast}
        </div>
      )}

      {/* Your resume */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Resume</h1>
            <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: 0 }}>
              What the agent tailors and submits per job.
              {sourceUrl && (
                <>
                  {" "}<a href={sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#024950", fontWeight: 700, textDecoration: "none" }}>
                    View original upload →
                  </a>
                </>
              )}
            </p>
          </div>
          <label style={{
            flexShrink: 0, background: "#024950", color: "#fff", borderRadius: 20, padding: "11px 20px",
            fontSize: 13, fontWeight: 700, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? "Processing…" : structured ? "Replace resume" : "Upload resume"}
            <input
              type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = "" }}
            />
          </label>
        </div>

        {loading || uploading ? (
          <div style={{ ...SHIMMER, height: 600 }} />
        ) : structured ? (
          <InvictusResumeView resume={structured} />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No resume uploaded yet</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 320 }}>
              Upload one above to generate the version the agent tailors and submits.
            </p>
          </div>
        )}
      </div>

      {/* How it gets submitted */}
      <div style={CARD}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>How it gets submitted</h2>
        <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>
          The agent tailors your resume per job before applying — these are the actual compiled PDFs it sent.
        </p>

        {loading ? (
          <div style={{ ...SHIMMER, height: 80 }} />
        ) : recentSubmissions.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentSubmissions.map((s, i) => (
              <a
                key={i}
                href={s.url ?? undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 16px", background: "#F5F8F7", borderRadius: 10,
                  textDecoration: "none", color: "#003135",
                }}
              >
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700 }}>{s.title ?? "—"}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.5)" }}>{s.company ?? "—"}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, color: "rgba(0,49,53,0.4)" }}>{timeAgo(s.submittedAt)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#024950" }}>View →</span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "28px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No applications submitted yet</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 320 }}>
              Once the agent applies to a job, the tailored resume it sent will show up here.
            </p>
          </div>
        )}
      </div>

      {/* Advanced: edit the underlying LaTeX source */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 4px" }}>Edit source (advanced)</h2>
            <p style={{ fontSize: 12, color: "rgba(0,49,53,0.5)", margin: 0 }}>
              What the agent actually compiles per job. Editing this does <strong>not</strong> change the preview
              above — that&apos;s rendered from your structured resume data, this is the raw LaTeX built from it.
            </p>
          </div>
          <span onClick={() => setShowSource(p => !p)} style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer", flexShrink: 0 }}>
            {showSource ? "Hide" : "Show"}
          </span>
        </div>

        {showSource && (
          loading ? (
            <div style={{ ...SHIMMER, height: 420, marginTop: 16 }} />
          ) : (
            <>
              {!hasDoc && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10, marginTop: 16 }}>
                  <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No source generated yet</p>
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 320 }}>
                    Upload a resume above to generate one, or paste your own .tex below.
                  </p>
                </div>
              )}
              <textarea
                value={texContent}
                onChange={e => setTexContent(e.target.value)}
                style={{ ...TEXTAREA, marginTop: 16 }}
                spellCheck={false}
                placeholder="\documentclass{article}..."
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
                <button
                  onClick={save}
                  disabled={saving || !texContent.trim()}
                  style={{
                    background: "#024950", color: "#fff", border: "none", borderRadius: 20, padding: "12px 24px",
                    fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                    cursor: (saving || !texContent.trim()) ? "default" : "pointer",
                    opacity: (saving || !texContent.trim()) ? 0.6 : 1,
                  }}
                >
                  {saving ? "Saving…" : "Save resume"}
                </button>
              </div>
            </>
          )
        )}
      </div>
    </div>
  )
}
