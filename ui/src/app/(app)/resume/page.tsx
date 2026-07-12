"use client"

import { useEffect, useRef, useState } from "react"

const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
}
const TEXTAREA: React.CSSProperties = {
  width: "100%", minHeight: 480, padding: "16px 18px", fontSize: 13, lineHeight: 1.6,
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

export default function ResumePage() {
  const [loading, setLoading] = useState(true)
  const [texContent, setTexContent] = useState("")
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [hasDoc, setHasDoc] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/resume")
      .then(r => r.json())
      .then(d => {
        const resume: ResumeDoc | null = d?.resume ?? null
        setTexContent(resume?.tex_content ?? "")
        setHasDoc(!!resume)
        setSourceUrl(d?.sourceUrl ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
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

      <div style={CARD}>
        <h1 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Resume</h1>
        <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>
          This is the exact LaTeX the agent tailors and compiles for every application.
          Generated once from the resume you uploaded during onboarding — edit it directly if the
          conversion missed something.
        </p>

        {sourceUrl && (
          <a
            href={sourceUrl} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "#024950", textDecoration: "none", marginBottom: 20 }}
          >
            ↓ View originally uploaded file
          </a>
        )}

        {loading ? (
          <div style={{ ...SHIMMER, height: 480 }} />
        ) : (
          <>
            {!hasDoc && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10, marginBottom: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No resume yet</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 320 }}>
                  Upload a resume during onboarding to generate one, or paste your own .tex below.
                </p>
              </div>
            )}
            <textarea
              value={texContent}
              onChange={e => setTexContent(e.target.value)}
              style={TEXTAREA}
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
        )}
      </div>
    </div>
  )
}
