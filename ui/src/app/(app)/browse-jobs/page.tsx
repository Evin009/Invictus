"use client"

import { useEffect, useRef, useState } from "react"

const CSS = `
  @keyframes bj-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .bj-card { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: pointer; }
  .bj-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(0,49,53,0.1) !important; }
  .bj-pill:hover { opacity: 0.88; }
  .bj-opt:hover { background: rgba(0,49,53,0.05); }
  input::placeholder { color: rgba(0,49,53,0.4); }
`

const SHIMMER = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "bj-shimmer 1.4s ease infinite",
  borderRadius: "6px",
} as React.CSSProperties

const FILTER_KEYS = ["Posted date", "Location", "Workplace", "Companies", "Degree Level", "Sponsors Visa", "Job Type"]
const FILTER_OPTIONS: Record<string, string[]> = {
  "Posted date": ["Any time", "Past 24 hours", "Past week", "Past month"],
  "Location": ["Remote", "San Francisco, CA", "New York, NY", "Austin, TX", "Tampa, FL"],
  "Workplace": ["Remote", "Hybrid", "Onsite"],
  "Companies": ["Any"],
  "Degree Level": ["High school", "Associate", "Bachelor's", "Master's", "PhD"],
  "Sponsors Visa": ["Yes", "No", "Any"],
  "Job Type": ["Full-time", "Part-time", "Internship", "Contract"],
}
const SORT_OPTIONS = ["Best match", "Most recent", "Salary: high to low"]

// Deterministic avatar color from company name
const AVATAR_COLORS = ["#E4D9F2","#CDEFF2","#D8EFE1","#F6D9CF","#E4E9F2","#F2E8D9","#D9EBF2"]
function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(company: string) {
  return company.split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "??"
}

interface RawJob {
  id: string
  url: string
  title: string | null
  company: string | null
  source: string | null
  discovered_at: string | null
}

// Fallback demo jobs if DB is empty
const DEMO_JOBS: RawJob[] = [
  { id:"j1", url:"#", title:"AI Engineer", company:"Cadre AI", source:"search", discovered_at: new Date(Date.now()-2*86400000).toISOString() },
  { id:"j2", url:"#", title:"AI Talent Development Intern", company:"Tenexlabs", source:"search", discovered_at: new Date(Date.now()-6*3600000).toISOString() },
  { id:"j3", url:"#", title:"Computer Science Internship", company:"University of South Florida", source:"crawler", discovered_at: new Date(Date.now()-86400000).toISOString() },
  { id:"j4", url:"#", title:"Product Design Intern", company:"Brightline Labs", source:"watchlist", discovered_at: new Date(Date.now()-4*86400000).toISOString() },
  { id:"j5", url:"#", title:"Backend Engineer", company:"Strata", source:"search", discovered_at: new Date(Date.now()-5*86400000).toISOString() },
]

function timeAgo(iso: string | null) {
  if (!iso) return "—"
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

export default function BrowseJobsPage() {
  const [loading, setLoading] = useState(true)
  const [jobs, setJobs] = useState<RawJob[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [appliedIds, setAppliedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sortValue, setSortValue] = useState("Best match")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch("/api/jobs")
      .then(r => r.json())
      .then((data: RawJob[]) => {
        const list = Array.isArray(data) && data.length > 0 ? data : DEMO_JOBS
        setJobs(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch(() => {
        setJobs(DEMO_JOBS)
        setSelectedId(DEMO_JOBS[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  // Close dropdowns on outside click
  useEffect(() => {
    if (!openFilter) return
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [openFilter])

  const q = searchQuery.trim().toLowerCase()
  const filtered = jobs.filter(j => {
    if (q && !j.title?.toLowerCase().includes(q) && !j.company?.toLowerCase().includes(q)) return false
    return true
  })

  const selected = jobs.find(j => j.id === selectedId) ?? null

  function toggleFilter(key: string) {
    setOpenFilter(p => p === key ? null : key)
  }
  function selectFilterValue(key: string, val: string) {
    setFilterValues(p => ({ ...p, [key]: val }))
    setOpenFilter(null)
  }
  function removeFilter(key: string) {
    setFilterValues(p => { const n = { ...p }; delete n[key]; return n })
  }
  function applyTo(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setAppliedIds(p => p.includes(id) ? p : [...p, id])
  }

  const pillStyle = (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 8,
    borderRadius: 20, padding: "9px 16px", cursor: "pointer",
    background: active ? "#024950" : "#F5F8F7",
    color: active ? "#fff" : "#003135",
    userSelect: "none",
  })

  const dropdownPanel: React.CSSProperties = {
    position: "absolute", top: "calc(100% + 6px)", left: 0, minWidth: 180,
    background: "#fff", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,49,53,0.14)",
    padding: 6, zIndex: 50, display: "flex", flexDirection: "column", gap: 2,
    maxHeight: 260, overflowY: "auto",
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={containerRef} style={{ flex: 1, overflow: "hidden", display: "flex", gap: 20, minWidth: 0, height: "100%" }}>

        {/* Job list column */}
        <div style={{ flex: "1.4", display: "flex", flexDirection: "column", gap: 14, minWidth: 0, overflowY: "auto" }}>

          {/* Toolbar */}
          <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: "18px 20px", flexShrink: 0 }}>
            {/* Search */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F5F8F7", borderRadius: 10, padding: "0 16px", marginBottom: 14 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(0,49,53,0.4)", flexShrink: 0 }}>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search by title or keyword…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "inherit", fontSize: 14, padding: "12px 0", color: "#003135" }}
              />
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FILTER_KEYS.map(key => {
                const val = filterValues[key]
                const active = !!val
                const isOpen = openFilter === key
                return (
                  <div key={key} style={{ position: "relative" }}>
                    <div className="bj-pill" onClick={() => toggleFilter(key)} style={pillStyle(active)}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{active ? `${key}: ${val}` : key}</span>
                      {active ? (
                        <span onClick={e => { e.stopPropagation(); removeFilter(key) }} style={{ cursor: "pointer", opacity: 0.7, fontSize: 15, lineHeight: 1 }}>×</span>
                      ) : (
                        <span style={{ opacity: 0.4, fontSize: 11 }}>▾</span>
                      )}
                    </div>
                    {isOpen && (
                      <div style={dropdownPanel}>
                        {(FILTER_OPTIONS[key] ?? []).map(opt => (
                          <div
                            key={opt}
                            className="bj-opt"
                            onClick={() => selectFilterValue(key, opt)}
                            style={{
                              padding: "10px 14px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                              fontWeight: opt === val ? 700 : 500,
                              color: opt === val ? "#964734" : "#003135",
                              background: opt === val ? "rgba(150,71,52,0.08)" : "transparent",
                            }}
                          >
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Results header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.5)" }}>
              {loading ? "Loading…" : `${filtered.length} match${filtered.length !== 1 ? "es" : ""}`}
            </p>
            <div style={{ position: "relative" }}>
              <div
                onClick={() => toggleFilter("__sort")}
                style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "8px 14px", boxShadow: "0 1px 3px rgba(0,49,53,0.06)", cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{sortValue}</span>
                <span style={{ color: "rgba(0,49,53,0.35)", fontSize: 11 }}>▾</span>
              </div>
              {openFilter === "__sort" && (
                <div style={{ ...dropdownPanel, left: "auto", right: 0 }}>
                  {SORT_OPTIONS.map(opt => (
                    <div
                      key={opt}
                      className="bj-opt"
                      onClick={() => { setSortValue(opt); setOpenFilter(null) }}
                      style={{
                        padding: "10px 14px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                        fontWeight: opt === sortValue ? 700 : 500,
                        color: opt === sortValue ? "#964734" : "#003135",
                        background: opt === sortValue ? "rgba(150,71,52,0.08)" : "transparent",
                      }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Job cards */}
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0,1,2,3,4].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "18px 20px", boxShadow: "0 1px 3px rgba(0,49,53,0.05)" }}>
                  <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                    <div style={{ ...SHIMMER, width: 42, height: 42, borderRadius: 11, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...SHIMMER, height: 15, width: "55%", marginBottom: 8 }} />
                      <div style={{ ...SHIMMER, height: 12, width: "35%" }} />
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <div style={{ ...SHIMMER, height: 22, width: 70, borderRadius: 14 }} />
                        <div style={{ ...SHIMMER, height: 22, width: 60, borderRadius: 14 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                    <div style={{ ...SHIMMER, height: 11, width: 80 }} />
                    <div style={{ ...SHIMMER, height: 28, width: 90, borderRadius: 16 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: "linear-gradient(135deg,rgba(15,164,175,0.08),rgba(150,71,52,0.06))", borderRadius: 18, padding: "44px 24px", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#024950" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No jobs match your search</p>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(0,49,53,0.55)" }}>Try a different keyword or clear your search to see all matches.</p>
              <button onClick={() => setSearchQuery("")} style={{ background: "#964734", border: "none", color: "#fff", borderRadius: 20, padding: "11px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Clear search</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filtered.map(j => {
                const isSelected = j.id === selectedId
                const applied = appliedIds.includes(j.id)
                const co = j.company ?? "Unknown"
                return (
                  <div
                    key={j.id}
                    className="bj-card"
                    onClick={() => setSelectedId(j.id)}
                    style={{
                      background: "#fff", borderRadius: 16, padding: "18px 20px",
                      boxShadow: isSelected ? "0 0 0 2px #024950, 0 1px 3px rgba(0,49,53,0.06)" : "0 1px 3px rgba(0,49,53,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 11, background: avatarColor(co), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0, color: "#003135" }}>
                        {initials(co)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div>
                            <p style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title ?? "Untitled"}</p>
                            <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.55)" }}>{co}{j.source ? ` · via ${j.source}` : ""}</p>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                          {j.source && (
                            <span style={{ background: "#F5F8F7", color: "rgba(0,49,53,0.6)", fontSize: 12, fontWeight: 600, padding: "5px 10px", borderRadius: 14 }}>{j.source}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                      <span style={{ fontSize: 12, color: "rgba(0,49,53,0.4)" }}>Discovered {timeAgo(j.discovered_at)}</span>
                      <button
                        onClick={e => applyTo(j.id, e)}
                        style={{
                          border: "none", borderRadius: 16, padding: "8px 16px", fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                          cursor: applied ? "default" : "pointer",
                          background: applied ? "rgba(15,164,175,0.12)" : "#964734",
                          color: applied ? "#0FA4AF" : "#fff",
                        }}
                      >
                        {applied ? "Applied ✓" : "Quick apply"}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div style={{
          width: 340, flexShrink: 0, background: "#fff", borderRadius: 18,
          boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 28,
          alignSelf: "flex-start", position: "sticky", top: 0, overflowY: "auto", maxHeight: "100%",
        }}>
          {selected ? (
            <>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: avatarColor(selected.company ?? ""), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#003135" }}>
                {initials(selected.company ?? "")}
              </div>
              <h2 style={{ margin: "14px 0 4px", fontSize: 20, fontWeight: 700 }}>{selected.title ?? "Untitled"}</h2>
              <p style={{ margin: "0 0 18px", fontSize: 14, color: "rgba(0,49,53,0.55)" }}>
                {selected.company}{selected.source ? ` · via ${selected.source}` : ""}
              </p>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 22 }}>
                {selected.source && (
                  <span style={{ background: "#F5F8F7", color: "rgba(0,49,53,0.6)", fontSize: 12, fontWeight: 600, padding: "6px 12px", borderRadius: 14 }}>{selected.source}</span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Discovered</span>
                  <span style={{ fontWeight: 700 }}>{timeAgo(selected.discovered_at)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Source</span>
                  <span style={{ fontWeight: 700 }}>{selected.source ?? "—"}</span>
                </div>
              </div>

              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(0,49,53,0.65)", margin: "0 0 24px" }}>
                Job discovered by Invictus agents. Click &ldquo;Quick apply&rdquo; to queue this job for the next automated application run, or open it directly to apply manually.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  onClick={() => applyTo(selected.id)}
                  style={{
                    width: "100%", border: "none", borderRadius: 20, padding: 13, fontFamily: "inherit",
                    fontSize: 14, fontWeight: 700,
                    cursor: appliedIds.includes(selected.id) ? "default" : "pointer",
                    background: appliedIds.includes(selected.id) ? "rgba(15,164,175,0.12)" : "#964734",
                    color: appliedIds.includes(selected.id) ? "#0FA4AF" : "#fff",
                  }}
                >
                  {appliedIds.includes(selected.id) ? "Applied ✓" : "Quick apply →"}
                </button>
                {selected.url && selected.url !== "#" && (
                  <a
                    href={selected.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block", width: "100%", border: "1.5px solid rgba(0,49,53,0.14)", borderRadius: 20, padding: "12px 13px",
                      fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer",
                      background: "transparent", color: "#003135", textAlign: "center", textDecoration: "none",
                    }}
                  >
                    Open listing ↗
                  </a>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <p style={{ color: "rgba(0,49,53,0.4)", fontSize: 14 }}>Select a job to see details</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
