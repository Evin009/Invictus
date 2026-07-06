"use client"

import { useEffect, useRef, useState } from "react"

const CSS = `
  @keyframes set-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .st-input:focus { border-color: #0FA4AF !important; background: #fff !important; box-shadow: 0 0 0 3px rgba(15,164,175,0.15) !important; }
  .toggle-track:hover { box-shadow: 0 0 0 5px rgba(0,49,53,0.06); }
  input[type=range] { accent-color: #964734; }
  input::placeholder { color: rgba(0,49,53,0.4); }
`

const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "set-shimmer 1.4s ease infinite",
  borderRadius: 6,
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
const ROW: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
  padding: "16px 0", borderTop: "1px solid rgba(0,49,53,0.06)",
}

function Toggle({ checked, onToggle }: { checked: boolean; onToggle: () => void }) {
  return (
    <div
      className="toggle-track"
      onClick={onToggle}
      style={{
        width: 42, height: 24, borderRadius: 14, cursor: "pointer", position: "relative", flexShrink: 0,
        background: checked ? "#964734" : "rgba(0,49,53,0.14)",
        transition: "background 0.15s ease, box-shadow 0.15s ease",
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3,
        left: checked ? 21 : 3,
        transition: "left 0.15s ease",
        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
      }} />
    </div>
  )
}

interface AutomationState {
  autoApply: boolean
  threshold: number
  dailyCap: string
  paused: boolean
}
interface NotifState {
  emailUpdates: boolean
  applicationSubmitted: boolean
  interviewScheduled: boolean
  weeklySummary: boolean
}

const NOTIF_DEFS = [
  { key: "emailUpdates" as const, label: "Email updates", desc: "General product announcements and tips" },
  { key: "applicationSubmitted" as const, label: "Application submitted", desc: "When the agent successfully submits an application" },
  { key: "interviewScheduled" as const, label: "Interview scheduled", desc: "When a company responds with next steps" },
  { key: "weeklySummary" as const, label: "Weekly summary", desc: "A digest of activity every Monday morning" },
]

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [email, setEmail] = useState("")
  const [baselineEmail, setBaselineEmail] = useState("")
  const [automation, setAutomation] = useState<AutomationState>({
    autoApply: true, threshold: 82, dailyCap: "15", paused: false,
  })
  const [baselineCap, setBaselineCap] = useState("15")
  const [notifs, setNotifs] = useState<NotifState>({
    emailUpdates: true, applicationSubmitted: true, interviewScheduled: true, weeklySummary: false,
  })

  useEffect(() => {
    // No dedicated automation/notification table yet; just load email from profile
    fetch("/api/profile")
      .then(r => r.json())
      .then(d => {
        const e = d?.email ?? ""
        setEmail(e)
        setBaselineEmail(e)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const isDirty = email !== baselineEmail || automation.dailyCap !== baselineCap

  function save() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setSaving(true)
    saveTimer.current = setTimeout(() => {
      setSaving(false)
      setShowToast(true)
      setBaselineEmail(email)
      setBaselineCap(automation.dailyCap)
      toastTimer.current = setTimeout(() => setShowToast(false), 2600)
    }, 700)
  }

  function discard() {
    setEmail(baselineEmail)
    setAutomation(p => ({ ...p, dailyCap: baselineCap }))
  }

  if (loading) return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Settings</h1>
        {[2, 3, 4, 3].map((rows, i) => (
          <div key={i} style={CARD}>
            <div style={{ ...SHIMMER, height: 16, width: 140, marginBottom: 10 }} />
            <div style={{ ...SHIMMER, height: 11, width: 220, marginBottom: 20 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {Array(rows).fill(0).map((_, j) => (
                <div key={j} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "14px 0", borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ ...SHIMMER, height: 13, width: "40%", marginBottom: 6 }} />
                    <div style={{ ...SHIMMER, height: 10, width: "60%" }} />
                  </div>
                  <div style={{ ...SHIMMER, width: 42, height: 24, borderRadius: 14, flexShrink: 0 }} />
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
      {showToast && (
        <div style={{
          position: "fixed", top: 24, right: 24, display: "flex", alignItems: "center", gap: 10,
          background: "#fff", color: "#003135", borderRadius: 12, padding: "13px 18px",
          boxShadow: "0 12px 28px rgba(0,49,53,0.18)", border: "1px solid rgba(15,164,175,0.3)",
          fontSize: 13, fontWeight: 600, zIndex: 50,
        }}>
          <span style={{ color: "#0FA4AF", fontSize: 16 }}>✓</span>
          Settings saved
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, paddingBottom: 80 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Settings</h1>

        {/* Account */}
        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Account</h2>
          <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>Your login details and how you sign in</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={LABEL}>Email</label>
              <input className="st-input" type="text" value={email} onChange={e => setEmail(e.target.value)} style={INPUT} />
            </div>
            <div>
              <label style={LABEL}>Password</label>
              <div style={{ display: "flex", gap: 10 }}>
                <input type="password" value="••••••••••" disabled style={{ ...INPUT, flex: 1, color: "rgba(0,49,53,0.4)" }} />
                <button style={{ background: "#F5F8F7", border: "none", borderRadius: 8, padding: "0 18px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, color: "#024950", cursor: "pointer" }}>Change</button>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "#F5F8F7", borderRadius: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#024950" }}>G</div>
              <div>
                <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700 }}>Google</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Connected as {email}</p>
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#0FA4AF" }}>Connected</span>
          </div>
        </div>

        {/* Automation */}
        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Automation</h2>
          <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 4px" }}>Controls how aggressively the agent applies on your behalf</p>

          <div style={ROW}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>Auto-apply to strong matches</p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Skip manual approval for jobs scoring above your threshold</p>
            </div>
            <Toggle checked={automation.autoApply} onToggle={() => setAutomation(p => ({ ...p, autoApply: !p.autoApply }))} />
          </div>

          {automation.autoApply && (
            <div style={ROW}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>Match threshold</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Only auto-apply above {automation.threshold}% match</p>
                <input
                  type="range" min={50} max={99}
                  value={automation.threshold}
                  onChange={e => setAutomation(p => ({ ...p, threshold: parseInt(e.target.value, 10) }))}
                  style={{ width: "100%", marginTop: 10 }}
                />
              </div>
            </div>
          )}

          <div style={ROW}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>Daily application cap</p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Maximum applications the agent submits per day</p>
            </div>
            <input
              className="st-input"
              type="text"
              value={automation.dailyCap}
              onChange={e => setAutomation(p => ({ ...p, dailyCap: e.target.value }))}
              style={{ width: 70, padding: "10px 12px", fontSize: 14, fontFamily: "inherit", borderRadius: 8, border: "1px solid rgba(0,49,53,0.14)", outline: "none", background: "#F5F8F7", color: "#003135", textAlign: "center" }}
            />
          </div>

          <div style={ROW}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>Pause agent</p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Stop all new applications until you resume</p>
            </div>
            <Toggle checked={automation.paused} onToggle={() => setAutomation(p => ({ ...p, paused: !p.paused }))} />
          </div>
        </div>

        {/* Notifications */}
        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Notifications</h2>
          <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 4px" }}>What you hear about, and how</p>
          {NOTIF_DEFS.map((def, i) => (
            <div key={def.key} style={{ ...ROW, borderTop: i === 0 ? "none" : "1px solid rgba(0,49,53,0.06)", paddingTop: i === 0 ? 16 : undefined }}>
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>{def.label}</p>
                <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>{def.desc}</p>
              </div>
              <Toggle checked={notifs[def.key]} onToggle={() => setNotifs(p => ({ ...p, [def.key]: !p[def.key] }))} />
            </div>
          ))}
        </div>

        {/* Billing */}
        <div style={CARD}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Billing</h2>
          <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>Your plan and usage this cycle</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#003135", borderRadius: 14, padding: "20px 22px", color: "#fff", marginBottom: 16 }}>
            <div>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)" }}>CURRENT PLAN</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Free plan</p>
            </div>
            <button style={{ background: "#964734", color: "#fff", border: "none", borderRadius: 20, padding: "11px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Upgrade plan →</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 18 }}>
            {[["Applications used", "— / 20"], ["Renews", "—"], ["Payment method", "No card on file"]].map(([label, value]) => (
              <div key={label}>
                <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "rgba(0,49,53,0.4)" }}>{label}</p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...CARD, border: "1px solid rgba(150,71,52,0.25)" }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>Danger zone</h2>
          <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 4px" }}>These actions are irreversible</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderTop: "1px solid rgba(150,71,52,0.14)" }}>
            <div>
              <p style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700 }}>Delete account</p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Permanently remove your profile, applications, and history</p>
            </div>
            <button style={{ background: "#964734", color: "#fff", border: "none", borderRadius: 20, padding: "11px 20px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete account</button>
          </div>
        </div>
      </div>

      {/* Floating save bar */}
      <div style={{
        position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${isDirty ? 0 : 120}%)`,
        display: "flex", alignItems: "center", gap: 14,
        background: "#003135", color: "#fff", borderRadius: 14, padding: "14px 18px",
        boxShadow: "0 12px 28px rgba(0,49,53,0.28)",
        opacity: isDirty ? 1 : 0, transition: "transform 0.22s ease, opacity 0.22s ease", zIndex: 20,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>You have unsaved changes</span>
        <button onClick={discard} style={{ background: "transparent", color: "rgba(255,255,255,0.6)", border: "none", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Discard</button>
        <button onClick={save} disabled={saving} style={{
          background: "#964734", color: "#fff", border: "none", borderRadius: 20, padding: "9px 18px",
          fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.7 : 1,
        }}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </>
  )
}
