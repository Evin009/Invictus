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

interface ResumeDoc {
  id: string
  tex_content: string
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

export default function ResumePage() {
  const [loading, setLoading] = useState(true)
  const [texContent, setTexContent] = useState("")
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
      flash("Saved")
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
          position: "fixed", top: 24, right: 24, display: "flex", alignItems: "center", gap: 10,
          background: "#fff", color: "#003135", borderRadius: 12, padding: "13px 18px",
          boxShadow: "0 12px 28px rgba(0,49,53,0.18)", border: "1px solid rgba(15,164,175,0.3)",
          fontSize: 13, fontWeight: 600, zIndex: 50,
        }}>
          {toast}
        </div>
      )}

      {/* Your uploaded resume */}
      <div style={CARD}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Resume</h1>
            <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: 0 }}>
              The resume you uploaded — the agent tailors this per job.
            </p>
          </div>
          <label style={{
            flexShrink: 0, background: "#024950", color: "#fff", borderRadius: 20, padding: "11px 20px",
            fontSize: 13, fontWeight: 700, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? "Processing…" : sourceUrl ? "Replace resume" : "Upload resume"}
            <input
              type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }}
              disabled={uploading}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = "" }}
            />
          </label>
        </div>

        {loading || uploading ? (
          <div style={{ ...SHIMMER, height: 600 }} />
        ) : sourceUrl ? (
          <iframe
            src={sourceUrl}
            title="Uploaded resume"
            style={{ width: "100%", height: 600, border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10 }}
          />
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
              The LaTeX converted from your upload — the agent tailors this per job. Only edit if the conversion missed something.
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
