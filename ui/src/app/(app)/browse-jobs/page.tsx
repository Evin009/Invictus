"use client"

import { useEffect, useRef, useState } from "react"

const CSS = `
  @keyframes bj-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .bj-card { transition: transform 0.22s cubic-bezier(0.32,0.72,0,1), box-shadow 0.22s cubic-bezier(0.32,0.72,0,1), background 0.15s ease; cursor: pointer; }
  .bj-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(0,49,53,0.11) !important; }
  .bj-pill { transition: opacity 0.12s ease; }
  .bj-pill:hover { opacity: 0.82; }
  .bj-opt:hover { background: rgba(0,49,53,0.05); }
  .bj-apply { transition: opacity 0.12s ease, transform 0.12s ease; }
  .bj-apply:hover:not([disabled]) { opacity: 0.86; transform: translateY(-1px); }
  .bj-apply:active { transform: translateY(0) !important; }
  input::placeholder { color: rgba(0,49,53,0.4); }
`

const SHIMMER = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "bj-shimmer 1.4s ease infinite",
  borderRadius: "6px",
} as React.CSSProperties

const FILTER_KEYS = ["Term", "Posted date", "Location", "Workplace", "Companies", "Degree Level", "Sponsors Visa", "Job Type"]
const FILTER_OPTIONS: Record<string, string[]> = {
  "Term": ["Fall", "Spring", "Winter", "Summer"],
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
function sourceColor(src: string | null) {
  if (src === "search")    return "#0FA4AF"
  if (src === "watchlist") return "#964734"
  if (src === "crawler")   return "#024950"
  return "#9CA3A0"
}

interface RawJob {
  id: string
  url: string
  title: string | null
  company: string | null
  source: string | null
  discovered_at: string | null
  logo_url?: string | null
  term?: string | null
  job_type?: string | null
  location?: string | null
  status?: string | null
}

// Fallback demo jobs if DB is empty
const DEMO_JOBS: RawJob[] = [
  { id:"j1", url:"#", title:"AI Engineer", company:"Cadre AI", source:"search", discovered_at: new Date(Date.now()-2*86400000).toISOString(), term:"Fall", job_type:"Full-time", location:"Remote", status:"New" },
  { id:"j2", url:"#", title:"AI Talent Development Intern", company:"Tenexlabs", source:"search", discovered_at: new Date(Date.now()-6*3600000).toISOString(), term:"Summer", job_type:"Internship", location:"San Francisco, CA", status:"New" },
  { id:"j3", url:"#", title:"Computer Science Internship", company:"University of South Florida", source:"crawler", discovered_at: new Date(Date.now()-86400000).toISOString(), term:"Spring", job_type:"Internship", location:"Tampa, FL", status:"New" },
  { id:"j4", url:"#", title:"Product Design Intern", company:"Brightline Labs", source:"watchlist", discovered_at: new Date(Date.now()-4*86400000).toISOString(), term:"Fall", job_type:"Internship", location:"New York, NY", status:"New" },
  { id:"j5", url:"#", title:"Backend Engineer", company:"Strata", source:"search", discovered_at: new Date(Date.now()-5*86400000).toISOString(), term:"Winter", job_type:"Contract", location:"Austin, TX", status:"New" },
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
    if (filterValues["Term"] && j.term !== filterValues["Term"]) return false
    if (filterValues["Job Type"] && j.job_type !== filterValues["Job Type"]) return false
    if (filterValues["Location"] && j.location !== filterValues["Location"]) return false
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
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(0,49,53,0.35)", flexShrink: 0 }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                      background: isSelected ? "rgba(150,71,52,0.022)" : "#fff",
                      borderRadius: 16, padding: "18px 20px",
                      boxShadow: isSelected
                        ? "0 0 0 1.5px #964734, 0 8px 24px rgba(150,71,52,0.10)"
                        : "0 1px 3px rgba(0,49,53,0.05)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      {/* Avatar / logo */}
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        background: j.logo_url ? "#fff" : avatarColor(co),
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 700, color: "#003135",
                        boxShadow: "0 1px 3px rgba(0,49,53,0.08)",
                        overflow: "hidden",
                      }}>
                        {j.logo_url
                          ? <img src={j.logo_url} alt={co} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 6 }} />
                          : initials(co)
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{j.title ?? "Untitled"}</p>
                        <p style={{ margin: "0 0 10px", fontSize: 13, color: "rgba(0,49,53,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{co}</p>
                        {/* Meta chips row */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {j.term && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: "rgba(150,71,52,0.09)", color: "#964734" }}>
                              {j.term}
                            </span>
                          )}
                          {j.job_type && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: "rgba(0,49,53,0.06)", color: "rgba(0,49,53,0.65)" }}>
                              {j.job_type}
                            </span>
                          )}
                          {j.location && (
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 10, background: "rgba(0,49,53,0.06)", color: "rgba(0,49,53,0.65)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>
                              {j.location}
                            </span>
                          )}
                          {j.source && (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              background: `${sourceColor(j.source)}18`,
                              color: sourceColor(j.source),
                              fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 10,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: "50%", background: sourceColor(j.source), flexShrink: 0, display: "inline-block" }} />
                              {j.source}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(0,49,53,0.06)" }}>
                      <span style={{ fontSize: 12, color: "rgba(0,49,53,0.38)" }}>{timeAgo(j.discovered_at)}</span>
                      <button
                        className="bj-apply"
                        onClick={e => applyTo(j.id, e)}
                        style={{
                          border: "none", borderRadius: 20, padding: "8px 18px",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 700,
                          cursor: applied ? "default" : "pointer",
                          background: applied ? "rgba(15,164,175,0.12)" : "#964734",
                          color: applied ? "#0FA4AF" : "#fff",
                        }}
                      >
                        {applied ? "Applied" : "Quick apply"}
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
              {/* Avatar + title */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                  background: selected.logo_url ? "#fff" : avatarColor(selected.company ?? ""),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#003135",
                  boxShadow: "0 2px 8px rgba(0,49,53,0.1)",
                  overflow: "hidden",
                }}>
                  {selected.logo_url
                    ? <img src={selected.logo_url} alt={selected.company ?? ""} style={{ width: "100%", height: "100%", objectFit: "contain", padding: 8 }} />
                    : initials(selected.company ?? "")
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>{selected.title ?? "Untitled"}</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selected.company}</p>
                </div>
              </div>

              {/* Source badge */}
              {selected.source && (
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 20,
                  background: `${sourceColor(selected.source)}18`,
                  color: sourceColor(selected.source),
                  fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 12,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: sourceColor(selected.source), display: "inline-block" }} />
                  via {selected.source}
                </span>
              )}

              {/* Metadata */}
              <div style={{ borderTop: "1px solid rgba(0,49,53,0.07)", borderBottom: "1px solid rgba(0,49,53,0.07)", padding: "14px 0", marginBottom: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                {selected.term && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Term</span>
                    <span style={{ fontWeight: 700, color: "#964734", background: "rgba(150,71,52,0.09)", padding: "2px 10px", borderRadius: 8 }}>{selected.term}</span>
                  </div>
                )}
                {selected.job_type && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Job type</span>
                    <span style={{ fontWeight: 700 }}>{selected.job_type}</span>
                  </div>
                )}
                {selected.location && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Location</span>
                    <span style={{ fontWeight: 700 }}>{selected.location}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Posted</span>
                  <span style={{ fontWeight: 700 }}>{timeAgo(selected.discovered_at)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "rgba(0,49,53,0.45)", fontWeight: 600 }}>Status</span>
                  <span style={{ fontWeight: 700, color: appliedIds.includes(selected.id) ? "#0FA4AF" : "rgba(0,49,53,0.6)" }}>
                    {appliedIds.includes(selected.id) ? "Queued for apply" : selected.status ?? "New"}
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(0,49,53,0.6)", margin: "0 0 22px" }}>
                Discovered by Invictus agents. Queue it for the next automated run, or open the listing to apply manually.
              </p>

              {/* CTAs */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button
                  className="bj-apply"
                  onClick={() => applyTo(selected.id)}
                  style={{
                    width: "100%", border: "none", borderRadius: 20, padding: "13px 0",
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: appliedIds.includes(selected.id) ? "default" : "pointer",
                    background: appliedIds.includes(selected.id) ? "rgba(15,164,175,0.12)" : "#964734",
                    color: appliedIds.includes(selected.id) ? "#0FA4AF" : "#fff",
                  }}
                >
                  {appliedIds.includes(selected.id) ? "Queued" : "Quick apply"}
                </button>
                {selected.url && selected.url !== "#" && (
                  <a
                    href={selected.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: "block", width: "100%", textAlign: "center", textDecoration: "none",
                      border: "1.5px solid rgba(0,49,53,0.14)", borderRadius: 20, padding: "12px 0",
                      fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                      background: "transparent", color: "#003135",
                    }}
                  >
                    Open listing
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6, verticalAlign: "middle" }}><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </a>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 20px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#F5F8F7", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14, color: "rgba(0,49,53,0.35)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "rgba(0,49,53,0.4)" }}>Select a job to see details</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
