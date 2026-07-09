"use client"

import { useEffect, useRef, useState } from "react"
import gsap from "gsap"
import { CompanyLogo } from "@/components/company-logo"

const CSS = `
  @keyframes bj-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .bj-card {
    transition: transform 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.32s cubic-bezier(0.16,1,0.3,1), border-color 0.32s cubic-bezier(0.16,1,0.3,1);
    cursor: pointer;
  }
  .bj-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(2,49,53,0.04), 0 20px 36px -12px rgba(2,49,53,0.16) !important; }
  .bj-card:active { transform: translateY(-1px) scale(0.994); }
  .bj-pill { transition: opacity 0.12s ease; }
  .bj-pill:hover { opacity: 0.82; }
  .bj-opt:hover { background: rgba(0,49,53,0.05); }

  .bj-quickapply { position: relative; overflow: hidden; transition: transform 0.15s cubic-bezier(0.16,1,0.3,1); }
  .bj-quickapply .bj-qa-fill { position: absolute; inset: 0; background: #7C3A26; transform: scaleX(0); transform-origin: left; transition: transform 0.32s cubic-bezier(0.16,1,0.3,1); }
  .bj-quickapply:hover:not([disabled]) .bj-qa-fill { transform: scaleX(1); }
  .bj-quickapply .bj-qa-label { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 6px; }
  .bj-quickapply .bj-qa-arrow { transition: transform 0.28s cubic-bezier(0.16,1,0.3,1); }
  .bj-quickapply:hover:not([disabled]) .bj-qa-arrow { transform: translateX(3px); }
  .bj-quickapply:active:not([disabled]) { transform: scale(0.97); }

  .bj-pass { transition: background 0.18s ease, border-color 0.18s ease, transform 0.15s cubic-bezier(0.16,1,0.3,1); }
  .bj-pass:hover { background: rgba(0,49,53,0.06); border-color: rgba(0,49,53,0.2) !important; }
  .bj-pass:active { transform: scale(0.94); }

  .bj-batch-btn { transition: background 0.15s ease, opacity 0.15s ease; }
  .bj-batch-btn:hover:not([disabled]) { background: rgba(0,49,53,0.06); }
  .bj-batch-btn:disabled { opacity: 0.3; cursor: default; }

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
const SORT_OPTIONS = ["Best match", "Most recent"]
const BATCH_SIZE_OPTIONS = [12, 24, 48, 96]

function sourceColor(src: string | null) {
  if (src === "search")    return "#0FA4AF"
  if (src === "watchlist") return "#964734"
  if (src === "crawler")   return "#024950"
  return "#9CA3A0"
}

// Muted pastel wash per card, deterministic by company name — brand-adjacent
// hues only (teal/rust family + restrained neutrals), no purple.
const CARD_TINTS = ["#EEF7F6", "#FBF1EA", "#EEF3FB", "#F1F7ED", "#FBF0EF", "#F3F6F1"]
function cardTint(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CARD_TINTS[h % CARD_TINTS.length]
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
  { id:"j1", url:"#", title:"AI Engineer", company:"Anthropic", source:"search", discovered_at: new Date(Date.now()-2*86400000).toISOString(), term:"Fall", job_type:"Full-time", location:"Remote", status:"New" },
  { id:"j2", url:"#", title:"AI Talent Development Intern", company:"OpenAI", source:"search", discovered_at: new Date(Date.now()-6*3600000).toISOString(), term:"Summer", job_type:"Internship", location:"San Francisco, CA", status:"New" },
  { id:"j3", url:"#", title:"Computer Science Internship", company:"University of South Florida", source:"crawler", discovered_at: new Date(Date.now()-86400000).toISOString(), term:"Spring", job_type:"Internship", location:"Tampa, FL", status:"New" },
  { id:"j4", url:"#", title:"Product Design Intern", company:"Figma", source:"watchlist", discovered_at: new Date(Date.now()-4*86400000).toISOString(), term:"Fall", job_type:"Internship", location:"New York, NY", status:"New" },
  { id:"j5", url:"#", title:"Backend Engineer", company:"Stripe", source:"search", discovered_at: new Date(Date.now()-5*86400000).toISOString(), term:"Winter", job_type:"Contract", location:"Austin, TX", status:"New" },
  { id:"j6", url:"#", title:"Data Scientist Intern", company:"Netflix", source:"search", discovered_at: new Date(Date.now()-8*3600000).toISOString(), term:"Summer", job_type:"Internship", location:"Los Gatos, CA", status:"New" },
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
  const [passedIds, setPassedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [sortValue, setSortValue] = useState("Best match")
  const [batchSize, setBatchSize] = useState(12)
  const [batchIndex, setBatchIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)
  const cardListRef = useRef<HTMLDivElement>(null)

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

  // Stagger cards when data or batch changes
  useEffect(() => {
    if (loading || !cardListRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".bj-card", {
        opacity: 0, y: 18, scale: 0.98, duration: 0.42,
        ease: "power3.out", stagger: 0.045,
        clearProps: "transform,opacity",
      })
    }, cardListRef)
    return () => ctx.revert()
  }, [loading, batchIndex, batchSize, searchQuery, filterValues, sortValue])

  // Slide detail panel in when selection changes
  useEffect(() => {
    if (!detailRef.current || !selectedId) return
    gsap.fromTo(detailRef.current,
      { opacity: 0, x: 18 },
      { opacity: 1, x: 0, duration: 0.35, ease: "power3.out", clearProps: "transform,opacity" }
    )
  }, [selectedId])

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
    if (passedIds.includes(j.id)) return false
    if (q && !j.title?.toLowerCase().includes(q) && !j.company?.toLowerCase().includes(q)) return false
    if (filterValues["Term"] && j.term !== filterValues["Term"]) return false
    if (filterValues["Job Type"] && j.job_type !== filterValues["Job Type"]) return false
    if (filterValues["Location"] && j.location !== filterValues["Location"]) return false
    return true
  })

  const sorted = sortValue === "Most recent"
    ? [...filtered].sort((a, b) => new Date(b.discovered_at ?? 0).getTime() - new Date(a.discovered_at ?? 0).getTime())
    : filtered

  const totalBatches = Math.max(1, Math.ceil(sorted.length / batchSize))
  const safeBatchIndex = Math.min(batchIndex, totalBatches - 1)
  const paginated = sorted.slice(safeBatchIndex * batchSize, (safeBatchIndex + 1) * batchSize)

  const selected = jobs.find(j => j.id === selectedId) ?? null

  function toggleFilter(key: string) {
    setOpenFilter(p => p === key ? null : key)
  }
  function selectFilterValue(key: string, val: string) {
    setFilterValues(p => ({ ...p, [key]: val }))
    setOpenFilter(null)
    setBatchIndex(0)
  }
  function removeFilter(key: string) {
    setFilterValues(p => { const n = { ...p }; delete n[key]; return n })
    setBatchIndex(0)
  }
  function applyTo(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setAppliedIds(p => p.includes(id) ? p : [...p, id])
  }
  function passOn(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setPassedIds(p => p.includes(id) ? p : [...p, id])
    if (selectedId === id) {
      const next = sorted.find(j => j.id !== id)
      setSelectedId(next?.id ?? null)
    }
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

        {/* Job grid column */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0, overflowY: "auto" }}>

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
                onChange={e => { setSearchQuery(e.target.value); setBatchIndex(0) }}
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

          {/* Results header: count, batch size, batch pager, sort */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, flexWrap: "wrap", gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.5)" }}>
              {loading ? "Loading…" : `${sorted.length} match${sorted.length !== 1 ? "es" : ""}`}
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Batch size dropdown */}
              <div style={{ position: "relative" }}>
                <div
                  onClick={() => toggleFilter("__batch")}
                  style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "8px 14px", boxShadow: "0 1px 3px rgba(0,49,53,0.06)", cursor: "pointer" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{batchSize} per batch</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: "rgba(0,49,53,0.35)", flexShrink: 0 }}><path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                {openFilter === "__batch" && (
                  <div style={{ ...dropdownPanel, left: "auto", right: 0 }}>
                    {BATCH_SIZE_OPTIONS.map(opt => (
                      <div
                        key={opt}
                        className="bj-opt"
                        onClick={() => { setBatchSize(opt); setBatchIndex(0); setOpenFilter(null) }}
                        style={{
                          padding: "10px 14px", fontSize: 13, cursor: "pointer", borderRadius: 8,
                          fontWeight: opt === batchSize ? 700 : 500,
                          color: opt === batchSize ? "#964734" : "#003135",
                          background: opt === batchSize ? "rgba(150,71,52,0.08)" : "transparent",
                        }}
                      >
                        {opt} per batch
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Batch pager */}
              {totalBatches > 1 && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 2, background: "#fff", borderRadius: 10, boxShadow: "0 1px 3px rgba(0,49,53,0.06)", padding: 4 }}>
                  <button
                    className="bj-batch-btn"
                    disabled={safeBatchIndex === 0}
                    onClick={() => setBatchIndex(p => Math.max(0, p - 1))}
                    style={{ border: "none", background: "transparent", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#003135" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#003135", padding: "0 6px", minWidth: 56, textAlign: "center" }}>
                    Batch {safeBatchIndex + 1}/{totalBatches}
                  </span>
                  <button
                    className="bj-batch-btn"
                    disabled={safeBatchIndex >= totalBatches - 1}
                    onClick={() => setBatchIndex(p => Math.min(totalBatches - 1, p + 1))}
                    style={{ border: "none", background: "transparent", borderRadius: 7, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#003135" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}

              {/* Sort dropdown */}
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
                        onClick={() => { setSortValue(opt); setOpenFilter(null); setBatchIndex(0) }}
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
          </div>

          {/* Job card grid */}
          <div ref={cardListRef}>
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ background: "#fff", borderRadius: 28, padding: "20px 20px 18px", border: "1px solid rgba(0,49,53,0.065)", boxShadow: "0 1px 2px rgba(2,49,53,0.03), 0 8px 20px -12px rgba(2,49,53,0.08)" }}>
                  <div style={{ ...SHIMMER, width: 44, height: 44, borderRadius: 12, marginBottom: 18 }} />
                  <div style={{ ...SHIMMER, height: 15, width: "80%", marginBottom: 8 }} />
                  <div style={{ ...SHIMMER, height: 12, width: "50%", marginBottom: 18 }} />
                  <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                    <div style={{ ...SHIMMER, height: 20, width: 60, borderRadius: 8 }} />
                    <div style={{ ...SHIMMER, height: 20, width: 50, borderRadius: 8 }} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ ...SHIMMER, height: 36, width: 40, borderRadius: 15 }} />
                    <div style={{ ...SHIMMER, height: 36, flex: 1, borderRadius: 15 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div style={{ background: "linear-gradient(135deg,rgba(15,164,175,0.08),rgba(150,71,52,0.06))", borderRadius: 18, padding: "44px 24px", textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "#024950" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No jobs match your search</p>
              <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(0,49,53,0.55)" }}>Try a different keyword, clear a filter, or check jobs you passed on.</p>
              <button onClick={() => { setSearchQuery(""); setFilterValues({}); setPassedIds([]) }} style={{ background: "#964734", border: "none", color: "#fff", borderRadius: 20, padding: "11px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Reset view</button>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
              {paginated.map(j => {
                const isSelected = j.id === selectedId
                const applied = appliedIds.includes(j.id)
                const co = j.company ?? "Unknown"
                return (
                  <div
                    key={j.id}
                    className="bj-card"
                    onClick={() => setSelectedId(j.id)}
                    style={{
                      display: "flex", flexDirection: "column",
                      background: isSelected ? "#fff" : cardTint(co),
                      borderRadius: 28, padding: "20px 20px 18px",
                      border: isSelected ? "1.5px solid rgba(150,71,52,0.85)" : "1px solid rgba(0,49,53,0.065)",
                      boxShadow: isSelected
                        ? "0 0 0 3px rgba(150,71,52,0.1), 0 1px 2px rgba(2,49,53,0.04), 0 14px 28px -10px rgba(150,71,52,0.22)"
                        : "0 1px 2px rgba(2,49,53,0.03), 0 8px 20px -12px rgba(2,49,53,0.08)",
                    }}
                  >
                    {/* Logo tile (nested bezel) + source/time cluster */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
                      <div style={{
                        padding: 5, borderRadius: 16,
                        background: "rgba(2,49,53,0.025)",
                        border: "1px solid rgba(2,49,53,0.04)",
                      }}>
                        <CompanyLogo name={co} size={44} />
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5, marginTop: 2 }}>
                        {j.source && (
                          <span
                            title={`via ${j.source}`}
                            style={{ width: 7, height: 7, borderRadius: "50%", background: sourceColor(j.source), flexShrink: 0 }}
                          />
                        )}
                        <span style={{ fontSize: 10.5, color: "rgba(0,49,53,0.35)", fontWeight: 600, whiteSpace: "nowrap" }}>{timeAgo(j.discovered_at)}</span>
                      </div>
                    </div>

                    {/* Title + company */}
                    <p style={{ margin: "0 0 3px", fontSize: 15.5, fontWeight: 700, lineHeight: 1.32, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {j.title ?? "Untitled"}
                    </p>
                    <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(0,49,53,0.48)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {co}
                    </p>

                    {/* Meta tags */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18, flex: 1, alignContent: "flex-start" }}>
                      {j.term && (
                        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "rgba(150,71,52,0.09)", color: "#964734", letterSpacing: "0.01em" }}>
                          {j.term}
                        </span>
                      )}
                      {j.job_type && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 8, background: "rgba(2,49,53,0.045)", color: "rgba(0,49,53,0.62)" }}>
                          {j.job_type}
                        </span>
                      )}
                      {j.location && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 8, background: "rgba(2,49,53,0.045)", color: "rgba(0,49,53,0.62)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>
                          {j.location}
                        </span>
                      )}
                    </div>

                    {/* Pass + Quick apply */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        className="bj-pass"
                        onClick={e => passOn(j.id, e)}
                        title="Pass on this job"
                        style={{
                          width: 40, flexShrink: 0, border: "1px solid rgba(2,49,53,0.1)", borderRadius: 15,
                          background: "rgba(2,49,53,0.02)", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#003135" strokeWidth="2.1" strokeLinecap="round"/></svg>
                      </button>
                      <button
                        className="bj-quickapply"
                        disabled={applied}
                        onClick={e => applyTo(j.id, e)}
                        style={{
                          flex: 1, border: "none", borderRadius: 15, padding: "10px 0",
                          fontFamily: "inherit", fontSize: 12.5, fontWeight: 700,
                          cursor: applied ? "default" : "pointer",
                          background: applied ? "rgba(15,164,175,0.12)" : "#964734",
                          color: applied ? "#0FA4AF" : "#fff",
                        }}
                      >
                        {applied ? (
                          <span className="bj-qa-label">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#0FA4AF" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Applied
                          </span>
                        ) : (
                          <>
                            <span className="bj-qa-fill" />
                            <span className="bj-qa-label">
                              Quick apply
                              <svg className="bj-qa-arrow" width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </div>
        </div>

        {/* Detail panel */}
        <div ref={detailRef} style={{
          width: 340, flexShrink: 0, background: "#fff", borderRadius: 18,
          boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: 28,
          alignSelf: "flex-start", position: "sticky", top: 0, overflowY: "auto", maxHeight: "100%",
        }}>
          {selected ? (
            <>
              {/* Logo + title */}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ padding: 6, borderRadius: 18, background: "rgba(2,49,53,0.025)", border: "1px solid rgba(2,49,53,0.04)", flexShrink: 0 }}>
                  <CompanyLogo name={selected.company ?? "Unknown"} size={48} />
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
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="bj-pass"
                  onClick={() => passOn(selected.id)}
                  title="Pass on this job"
                  style={{
                    width: 48, flexShrink: 0, border: "1.5px solid rgba(0,49,53,0.14)", borderRadius: 20,
                    background: "transparent", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="#003135" strokeWidth="2.2" strokeLinecap="round"/></svg>
                </button>
                <button
                  className="bj-quickapply"
                  disabled={appliedIds.includes(selected.id)}
                  onClick={() => applyTo(selected.id)}
                  style={{
                    flex: 1, border: "none", borderRadius: 20, padding: "13px 0",
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: appliedIds.includes(selected.id) ? "default" : "pointer",
                    background: appliedIds.includes(selected.id) ? "rgba(15,164,175,0.12)" : "#964734",
                    color: appliedIds.includes(selected.id) ? "#0FA4AF" : "#fff",
                  }}
                >
                  {appliedIds.includes(selected.id) ? (
                    "Queued"
                  ) : (
                    <>
                      <span className="bj-qa-fill" />
                      <span className="bj-qa-label">
                        Quick apply
                        <svg className="bj-qa-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    </>
                  )}
                </button>
              </div>
              {selected.url && selected.url !== "#" && (
                <a
                  href={selected.url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: "block", width: "100%", textAlign: "center", textDecoration: "none",
                    border: "1.5px solid rgba(0,49,53,0.14)", borderRadius: 20, padding: "12px 0",
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    background: "transparent", color: "#003135", marginTop: 10,
                  }}
                >
                  Open listing
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft: 6, verticalAlign: "middle" }}><path d="M7 17L17 7M17 7H7M17 7v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )}
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
