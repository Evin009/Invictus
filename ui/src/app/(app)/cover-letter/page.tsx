"use client"

import { useEffect, useRef, useState } from "react"

const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
}
const TEXTAREA: React.CSSProperties = {
  width: "100%", minHeight: 340, padding: "16px 18px", fontSize: 14, lineHeight: 1.6,
  fontFamily: "inherit",
  borderRadius: 10, border: "1px solid rgba(0,49,53,0.14)", outline: "none",
  background: "#F5F8F7", color: "#003135", resize: "vertical",
}
const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%", animation: "cl-shimmer 1.4s ease infinite", borderRadius: 8,
}

type Mode = "reuse" | "tone_only"

interface Seed {
  id: string
  label: string | null
  content: string | null
  mode: Mode | null
}

export default function CoverLetterPage() {
  const [loading, setLoading] = useState(true)
  const [content, setContent] = useState("")
  const [mode, setMode] = useState<Mode>("tone_only")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/cover-letter")
      .then(r => r.json())
      .then(d => {
        const seed: Seed | null = d?.seed ?? null
        setContent(seed?.content ?? "")
        setMode(seed?.mode === "reuse" ? "reuse" : "tone_only")
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
      const res = await fetch("/api/cover-letter", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, mode }),
      })
      if (!res.ok) throw new Error()
      flash("Saved")
    } catch {
      flash("Couldn't save — try again")
    } finally {
      setSaving(false)
    }
  }

  async function handleUpload(file: File) {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    try {
      const res = await fetch("/api/cover-letter", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? "upload failed")
      setContent(data.content ?? "")
      setMode("reuse")
      flash(`Uploaded ${file.name}`)
    } catch {
      flash("Couldn't read that file")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, paddingBottom: 40 }}>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes cl-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }" }} />

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
        <h1 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Cover letter</h1>
        <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>
          {mode === "reuse"
            ? "The agent edits this exact letter for each job — company, role, and emphasis change, your wording stays."
            : "The agent writes a new letter from scratch for each job, matching this one's tone and style."}
        </p>

        {loading ? (
          <div style={{ ...SHIMMER, height: 340 }} />
        ) : (
          <>
            <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
              {([
                { value: "tone_only" as const, label: "Tone only", desc: "Write a new letter matching this style" },
                { value: "reuse" as const, label: "Use as-is", desc: "Edit this exact letter per job" },
              ]).map(opt => (
                <label key={opt.value} style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }}>
                  <input type="radio" checked={mode === opt.value} onChange={() => setMode(opt.value)} style={{ marginTop: 3 }} />
                  <span>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#003135" }}>{opt.label}</span>
                    <span style={{ display: "block", fontSize: 12, color: "rgba(0,49,53,0.5)" }}>{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {!content && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10, marginBottom: 16 }}>
                <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No cover letter yet</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 320 }}>
                  Paste one below, or upload a file you&apos;ve already written.
                </p>
              </div>
            )}

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              style={TEXTAREA}
              placeholder="Dear Hiring Manager, I'm excited to apply for..."
            />

            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
              <button
                onClick={save}
                disabled={saving || !content.trim()}
                style={{
                  background: "#024950", color: "#fff", border: "none", borderRadius: 20, padding: "12px 24px",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  cursor: (saving || !content.trim()) ? "default" : "pointer",
                  opacity: (saving || !content.trim()) ? 0.6 : 1,
                }}
              >
                {saving ? "Saving…" : "Save cover letter"}
              </button>

              <label style={{
                background: "#F5F8F7", color: "#024950", borderRadius: 20, padding: "12px 22px",
                fontSize: 13, fontWeight: 700, cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1,
              }}>
                {uploading ? "Uploading…" : "Upload your own"}
                <input
                  type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: "none" }}
                  disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = "" }}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
