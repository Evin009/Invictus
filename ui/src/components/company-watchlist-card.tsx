"use client"

import { useEffect, useRef, useState } from "react"
import { CompanyLogo } from "@/components/company-logo"

interface Company {
  name: string
  url: string
}

const CARD: React.CSSProperties = {
  background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 26,
}
const INPUT: React.CSSProperties = {
  width: "100%", padding: "13px 14px", fontSize: 14, fontFamily: "inherit",
  borderRadius: 8, border: "1px solid rgba(0,49,53,0.14)", outline: "none",
  background: "#F5F8F7", color: "#003135",
}
const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "cwc-shimmer 1.4s ease infinite",
  borderRadius: 6,
}

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

// Same design as the profile page's watchlist card — used on both Profile
// and Settings so the two never drift apart. Self-contained: fetches and
// persists on its own, no props needed.
export function CompanyWatchlistCard() {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyName, setCompanyName] = useState("")
  const [resolving, setResolving] = useState(false)
  const [manualUrlFor, setManualUrlFor] = useState<string | null>(null)
  const [manualUrl, setManualUrl] = useState("")
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/watchlist")
      .then(r => r.json())
      .then(d => setCompanies(Array.isArray(d?.watchlist) ? d.watchlist : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function persist(list: Company[]) {
    return fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ watchlist: list.map(c => ({ company_name: c.name, careers_url: c.url })) }),
    })
  }

  function flashError() {
    setToast("Couldn't save — try again")
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function addCompany() {
    const name = companyName.trim()
    if (!name) return
    setCompanyName("")
    setResolving(true)
    const resolved = await fetch(`/api/resolve-careers-url?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => d?.url ?? null)
      .catch(() => null)
    setResolving(false)

    const next = [...companies, { name, url: resolved ?? "" }]
    setCompanies(next)
    const res = await persist(next).catch(() => null)
    if (!res?.ok) flashError()
    if (!resolved) setManualUrlFor(name)
  }

  async function saveManualUrl() {
    if (!manualUrlFor || !manualUrl.trim()) return
    const next = companies.map(c => c.name === manualUrlFor ? { ...c, url: manualUrl.trim() } : c)
    setCompanies(next)
    setManualUrlFor(null)
    setManualUrl("")
    const res = await persist(next).catch(() => null)
    if (!res?.ok) flashError()
  }

  async function removeCompany(i: number) {
    const next = companies.filter((_, idx) => idx !== i)
    setCompanies(next)
    const res = await persist(next).catch(() => null)
    if (!res?.ok) flashError()
  }

  if (loading) {
    return (
      <div style={CARD}>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes cwc-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }" }} />
        <div style={{ ...SHIMMER, height: 17, width: 160, marginBottom: 18 }} />
        <div style={{ display: "flex", gap: 12 }}>
          {[0, 1, 2].map(i => <div key={i} style={{ ...SHIMMER, width: 46, height: 46, borderRadius: 10 }} />)}
        </div>
      </div>
    )
  }

  return (
    <div style={CARD}>
      <SectionHeader title="Company watchlist" editing={editing} onToggle={() => setEditing(p => !p)} />

      {toast && (
        <p style={{ fontSize: 12, color: "#964734", margin: "0 0 14px" }}>{toast}</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {companies.length > 0 ? companies.map((co, i) => (
          <div key={i} style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", width: 72 }}>
            <div style={{ position: "relative" }}>
              <CompanyLogo name={co.name} size={46} />
              {editing && (
                <span
                  onClick={() => removeCompany(i)}
                  style={{ position: "absolute", top: -6, right: -6, width: 17, height: 17, borderRadius: "50%", background: "#003135", color: "#fff", fontSize: 11, lineHeight: "17px", textAlign: "center", cursor: "pointer", userSelect: "none" }}
                >×</span>
              )}
            </div>
            {editing && (
              co.url ? (
                <span
                  onClick={() => { setManualUrlFor(co.name); setManualUrl(co.url) }}
                  style={{ fontSize: 10, color: "rgba(0,49,53,0.4)", marginTop: 4, cursor: "pointer", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}
                  title={co.url}
                >
                  {co.url.replace(/^https?:\/\//, "")}
                </span>
              ) : (
                <span
                  onClick={() => { setManualUrlFor(co.name); setManualUrl("") }}
                  style={{ fontSize: 10, color: "#964734", marginTop: 4, cursor: "pointer", fontWeight: 700 }}
                >
                  no URL — fix
                </span>
              )
            )}
          </div>
        )) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10, width: "100%" }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No companies on your watchlist</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)", maxWidth: 280 }}>Add dream companies and the agent will check them more aggressively.</p>
          </div>
        )}
      </div>

      {editing && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 16 }}>
            {companyName.trim() && <CompanyLogo name={companyName.trim()} size={42} />}
            <input
              className="pf-input" type="text" placeholder="Company name" value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && companyName.trim() && !resolving) { e.preventDefault(); addCompany() } }}
              style={{ ...INPUT, flex: 1 }}
              disabled={resolving}
            />
          </div>
          <p style={{ fontSize: 11, color: "rgba(0,49,53,0.4)", margin: "8px 0 0" }}>
            Career page found automatically — no URL needed. Click a company&apos;s URL above to override.
          </p>
          <button
            onClick={addCompany}
            disabled={resolving || !companyName.trim()}
            style={{ marginTop: 14, padding: "11px 20px", borderRadius: 20, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: resolving ? "default" : "pointer", opacity: resolving ? 0.6 : 1 }}
          >
            {resolving ? "Finding career page…" : "+ Add company"}
          </button>

          {manualUrlFor && (
            <div style={{ marginTop: 16, padding: 14, background: "#F5F8F7", borderRadius: 10 }}>
              <p style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700 }}>Career page URL for {manualUrlFor}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  className="pf-input" type="text" placeholder="https://company.com/careers" value={manualUrl}
                  onChange={e => setManualUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && manualUrl.trim()) { e.preventDefault(); saveManualUrl() } }}
                  style={{ ...INPUT, flex: 1, background: "#fff" }}
                />
                <button
                  onClick={saveManualUrl}
                  style={{ padding: "0 18px", borderRadius: 8, border: "none", background: "#024950", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setManualUrlFor(null); setManualUrl("") }}
                  style={{ padding: "0 14px", borderRadius: 8, border: "none", background: "transparent", color: "rgba(0,49,53,0.5)", fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
