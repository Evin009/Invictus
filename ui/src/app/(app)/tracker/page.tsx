"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"

const CSS = `
  @keyframes trk-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }
  .trk-card { transition: transform 0.2s cubic-bezier(0.32,0.72,0,1), box-shadow 0.2s cubic-bezier(0.32,0.72,0,1); cursor: grab; }
  .trk-card:hover { transform: translateY(-2px); box-shadow: 0 10px 22px rgba(0,49,53,0.13) !important; }
  .trk-card:active { cursor: grabbing; transform: scale(0.98) !important; }
`

const SHIMMER: React.CSSProperties = {
  background: "linear-gradient(90deg,#EDF2F0 25%,#F6F9F8 37%,#EDF2F0 63%)",
  backgroundSize: "400% 100%",
  animation: "trk-shimmer 1.4s ease infinite",
  borderRadius: 6,
}

const COLUMN_DEFS = [
  { id: "applied", label: "Applied", color: "#0FA4AF" },
  { id: "ghosted", label: "Ghosted", color: "#9CA3A0" },
  { id: "rejected", label: "Rejected", color: "#C4573F" },
  { id: "interview", label: "Interviewing", color: "#024950" },
  { id: "offer", label: "Offer", color: "#964734" },
]

const STATUS_MAP: Record<string, string> = {
  applied: "applied",
  ghosted: "ghosted",
  rejection: "rejected",
  manual_pending: "applied",
  interview: "interview",
}

const AVATAR_COLORS = ["#E4D9F2","#CDEFF2","#D8EFE1","#F6D9CF","#E4E9F2","#F2E8D9","#D9EBF2","#F0E4C8"]
function avatarColor(s: string) {
  let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}
function initials(s: string) {
  return s.split(/\s+/).slice(0,2).map(w => w[0]).join("").toUpperCase() || "??"
}

interface Card {
  id: string; company: string; role: string; applied: string
  initials: string; color: string; column: string
}

interface Application {
  id: string; company: string | null; title: string | null; status: string; submitted_at: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

// --- Sankey chart ---
const CHART_H = 280
const TOP_PAD = 16
const BOTTOM_PAD = 16
const AVAIL_H = CHART_H - TOP_PAD - BOTTOM_PAD
const SOURCE_X = 20, SOURCE_W = 10
const TARGET_X = 840, TARGET_W = 10
const LABEL_X = TARGET_X + TARGET_W + 60

function buildSankey(cards: Card[], hoverStage: string | null) {
  const total = Math.max(cards.length, 1)
  const nodes: { x:number;y:number;w:number;h:number;color:string;op:number;stage:string }[] = []
  const links: { path:string;color:string;op:number;stage:string }[] = []
  const labels: { text:string;x:number;y:number;color:string;op:number;stage:string }[] = []
  const leaders: { x1:number;y1:number;x2:number;y2:number;color:string;op:number }[] = []

  const dim = (s: string) => !!(hoverStage && hoverStage !== s)

  // Source node
  nodes.push({ x: SOURCE_X, y: TOP_PAD, w: SOURCE_W, h: AVAIL_H, color: "#003135", op: hoverStage ? 0.5 : 1, stage: "__src" })

  // Compute raw heights, normalize to fill AVAIL_H
  const rawH = COLUMN_DEFS.map(def => {
    const cnt = cards.filter(c => c.column === def.id).length
    return Math.max((cnt / total) * AVAIL_H, 8)
  })
  const rawTotal = rawH.reduce((a, b) => a + b, 0)
  const scale = AVAIL_H / rawTotal

  let srcCursor = TOP_PAD, tgtCursor = TOP_PAD
  const stageGeom: { def: typeof COLUMN_DEFS[0]; cnt: number; centerY: number }[] = []

  COLUMN_DEFS.forEach((def, i) => {
    const cnt = cards.filter(c => c.column === def.id).length
    const segH = rawH[i] * scale
    const sY0 = srcCursor, sY1 = srcCursor + segH
    srcCursor += segH
    const tY0 = tgtCursor, tY1 = tY0 + segH
    tgtCursor += segH

    const cx1 = SOURCE_X + SOURCE_W + (TARGET_X - SOURCE_X - SOURCE_W) * 0.42
    const cx2 = SOURCE_X + SOURCE_W + (TARGET_X - SOURCE_X - SOURCE_W) * 0.58
    const path = `M ${SOURCE_X + SOURCE_W} ${sY0} C ${cx1} ${sY0}, ${cx2} ${tY0}, ${TARGET_X} ${tY0} L ${TARGET_X} ${tY1} C ${cx2} ${tY1}, ${cx1} ${sY1}, ${SOURCE_X + SOURCE_W} ${sY1} Z`
    links.push({ path, color: def.color, op: hoverStage === def.id ? 0.55 : (dim(def.id) ? 0.1 : 0.32), stage: def.id })
    nodes.push({ x: TARGET_X, y: tY0, w: TARGET_W, h: segH, color: def.color, op: dim(def.id) ? 0.25 : 1, stage: def.id })
    stageGeom.push({ def, cnt, centerY: tY0 + segH / 2 })
  })

  // De-overlap labels
  const labelYs = stageGeom.map(g => g.centerY)
  const minGap = 20
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i < labelYs.length; i++) {
      if (labelYs[i] - labelYs[i-1] < minGap) labelYs[i] = labelYs[i-1] + minGap
    }
    for (let i = labelYs.length - 2; i >= 0; i--) {
      if (labelYs[i+1] - labelYs[i] < minGap) labelYs[i] = labelYs[i+1] - minGap
    }
  }

  stageGeom.forEach(({ def, cnt, centerY }, i) => {
    const labelY = labelYs[i]
    const op = dim(def.id) ? 0.25 : 1
    if (Math.abs(labelY - centerY) > 2) {
      leaders.push({ x1: TARGET_X + TARGET_W + 4, y1: centerY, x2: LABEL_X - 6, y2: labelY, color: def.color, op: op * 0.5 })
    }
    labels.push({ text: `${def.label}: ${cnt}`, x: LABEL_X, y: labelY, color: def.color, op, stage: def.id })
  })

  return { nodes, links, labels, leaders, total }
}

export default function TrackerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [cards, setCards] = useState<Card[]>([])
  const [hoverStage, setHoverStage] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<{ stage: string; y: number } | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const draggedId = useRef<string | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!headerRef.current) return
    gsap.from(headerRef.current, {
      opacity: 0, y: -14, duration: 0.45, ease: "power3.out",
      clearProps: "transform,opacity",
    })
  }, [])

  useEffect(() => {
    if (loading || !boardRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(".trk-col", {
        opacity: 0, y: 32, duration: 0.55,
        ease: "power3.out", stagger: 0.09,
        clearProps: "transform,opacity",
      })
    }, boardRef)
    return () => ctx.revert()
  }, [loading])

  useEffect(() => {
    fetch("/api/applications")
      .then(r => r.json())
      .then((data: Application[]) => {
        if (!Array.isArray(data) || data.length === 0) {
          setCards([])
          return
        }
        setCards(data.map(a => {
          const co = a.company ?? "Unknown"
          const col = STATUS_MAP[a.status] ?? "applied"
          return {
            id: a.id, company: co, role: a.title ?? "—",
            initials: initials(co), color: avatarColor(co),
            applied: timeAgo(a.submitted_at), column: col,
          }
        }))
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false))
  }, [])

  function onDragStart(id: string) {
    draggedId.current = id
  }
  function onDragOver(e: React.DragEvent, colId: string) {
    e.preventDefault()
    setDragOver(colId)
  }
  function onDragLeave() { setDragOver(null) }
  function onDrop(colId: string) {
    const id = draggedId.current
    if (!id) return
    setCards(prev => prev.map(c => c.id === id ? { ...c, column: colId } : c))
    draggedId.current = null
    setDragOver(null)
  }

  const { nodes, links, labels, leaders, total } = buildSankey(cards, hoverStage)
  const hasCards = cards.length > 0

  // Tooltip: find tooltip position for hovered stage
  const tooltipCards = tooltip ? cards.filter(c => c.column === tooltip.stage) : []
  const tooltipDef = tooltip ? COLUMN_DEFS.find(d => d.id === tooltip.stage) : null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={headerRef} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Application tracker</h1>
        <p style={{ margin: 0, fontSize: 13, color: "rgba(0,49,53,0.45)" }}>Drag cards between stages to update status</p>
      </div>

      {/* Sankey / loading */}
      {loading ? (
        <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: "22px 24px", flexShrink: 0 }}>
          <div style={{ ...SHIMMER, height: 12, width: 120, marginBottom: 16 }} />
          <div style={{ ...SHIMMER, height: 240, width: "100%", borderRadius: 10 }} />
        </div>
      ) : hasCards ? (
        <div style={{ background: "#fff", borderRadius: 18, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", padding: "22px 24px", flexShrink: 0, position: "relative" }}>
          <p style={{ margin: "0 0 14px", fontSize: 12, fontWeight: 700, letterSpacing: "0.05em", color: "rgba(0,49,53,0.4)" }}>PIPELINE FLOW</p>
          <div style={{ position: "relative", width: "100%", height: CHART_H }}>
            <svg viewBox={`0 0 1000 ${CHART_H}`} preserveAspectRatio="none" style={{ width: "100%", height: CHART_H, display: "block", overflow: "visible", position: "absolute", inset: 0 }}>
              {/* source label above bar */}
              <text x={SOURCE_X} y={TOP_PAD - 4} fontSize={13} fontWeight={700} fill="#003135" opacity={hoverStage ? 0.5 : 1} style={{ fontFamily: "inherit" }}>
                Jobs applied: {total}
              </text>
              {links.map((l, i) => (
                <path key={i} d={l.path} fill={l.color} opacity={l.op}
                  onMouseEnter={() => { setHoverStage(l.stage); setTooltip({ stage: l.stage, y: 0 }) }}
                  onMouseLeave={() => { setHoverStage(null); setTooltip(null) }}
                  style={{ transition: "opacity 0.15s ease", cursor: "pointer" }} />
              ))}
              {nodes.map((n, i) => (
                <rect key={i} x={n.x} y={n.y} width={n.w} height={n.h} rx={3} fill={n.color} opacity={n.op}
                  onMouseEnter={() => n.stage !== "__src" && (setHoverStage(n.stage), setTooltip({ stage: n.stage, y: n.y }))}
                  onMouseLeave={() => { setHoverStage(null); setTooltip(null) }}
                  style={{ transition: "opacity 0.15s ease", cursor: n.stage !== "__src" ? "pointer" : "default" }} />
              ))}
              {leaders.map((l, i) => (
                <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={1} opacity={l.op} style={{ transition: "opacity 0.15s ease" }} />
              ))}
              {labels.map((l, i) => (
                <text key={i} x={l.x} y={l.y} fontSize={13} fontWeight={700} fill={l.color} opacity={l.op}
                  dominantBaseline="middle"
                  onMouseEnter={() => { setHoverStage(l.stage); setTooltip({ stage: l.stage, y: l.y }) }}
                  onMouseLeave={() => { setHoverStage(null); setTooltip(null) }}
                  style={{ transition: "opacity 0.15s ease", cursor: "pointer", fontFamily: "inherit" }}>
                  {l.text}
                </text>
              ))}
            </svg>

            {/* Tooltip */}
            {tooltip && tooltipDef && (
              <div style={{
                position: "absolute", right: "16%",
                top: Math.round((tooltip.y / CHART_H) * 100) + "%",
                background: "#fff", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,49,53,0.18)",
                padding: "12px 14px", zIndex: 30, minWidth: 210, maxWidth: 300, pointerEvents: "none",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: tooltipDef.color, flexShrink: 0, display: "inline-block" }} />
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{tooltipDef.label} · {tooltipCards.length}</span>
                </div>
                {tooltipCards.length === 0 ? (
                  <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.4)" }}>No applications here yet</p>
                ) : tooltipCards.slice(0, 5).map((c, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "4px 0" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" }}>{c.company}</span>
                    <span style={{ fontSize: 11, color: "rgba(0,49,53,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{c.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Empty state */}
      {!loading && !hasCards && (
        <div style={{ background: "linear-gradient(135deg,rgba(15,164,175,0.08),rgba(150,71,52,0.06))", borderRadius: 18, flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 24px" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#024950", fontSize: 19 }}>◎</div>
          <p style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>No applications tracked yet</p>
          <p style={{ margin: "0 0 18px", fontSize: 13, color: "rgba(0,49,53,0.55)", maxWidth: 340 }}>Once the agent submits applications — or you add them yourself — they&apos;ll show up here as a pipeline you can drag between stages.</p>
          <button onClick={() => router.push("/browse-jobs")} style={{ background: "#964734", border: "none", color: "#fff", borderRadius: 20, padding: "11px 22px", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Browse jobs →</button>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div style={{ flex: 1, display: "flex", gap: 16, overflowX: "auto", overflowY: "hidden", minHeight: 0 }}>
          {COLUMN_DEFS.map(def => (
            <div key={def.id} style={{ background: "#fff", borderRadius: 16, width: 250, flexShrink: 0, boxShadow: "0 1px 3px rgba(0,49,53,0.05)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
              <div style={{ height: 3, background: def.color, opacity: 0.3, flexShrink: 0 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 14px 12px", flexShrink: 0 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: def.color, background: `${def.color}0e`, borderRadius: 8, padding: "5px 10px", opacity: 0.5 }}>{def.label}</span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, padding: "0 12px 12px" }}>
                {[0, 1].map(i => (
                  <div key={i} style={{ background: "#F5F8F7", borderRadius: 10, padding: "11px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div style={{ ...SHIMMER, width: 30, height: 30, borderRadius: 8, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ ...SHIMMER, height: 12, width: "70%", marginBottom: 6 }} />
                        <div style={{ ...SHIMMER, height: 10, width: "50%" }} />
                      </div>
                    </div>
                    <div style={{ ...SHIMMER, height: 9, width: "40%" }} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : hasCards ? (
        <div ref={boardRef} style={{ flex: 1, display: "flex", gap: 16, overflowX: "auto", overflowY: "hidden", minHeight: 0 }}>
          {COLUMN_DEFS.map(def => {
            const colCards = cards.filter(c => c.column === def.id)
            const isOver = dragOver === def.id
            return (
              <div
                key={def.id}
                className="trk-col"
                onDragOver={e => onDragOver(e, def.id)}
                onDragLeave={onDragLeave}
                onDrop={() => onDrop(def.id)}
                style={{
                  background: isOver ? `${def.color}0a` : "#fff",
                  borderRadius: 16, width: 250, flexShrink: 0,
                  boxShadow: isOver
                    ? `0 0 0 1.5px ${def.color}55, 0 4px 16px rgba(0,49,53,0.08)`
                    : "0 1px 3px rgba(0,49,53,0.05)",
                  display: "flex", flexDirection: "column",
                  height: "100%", minHeight: 0,
                  overflow: "hidden",
                  transition: "background 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                {/* Colored top accent bar */}
                <div style={{ height: 3, background: def.color, flexShrink: 0, opacity: 0.75 }} />

                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 14px 12px", flexShrink: 0 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 6, flex: 1,
                    fontSize: 13, fontWeight: 700, color: def.color,
                    background: `${def.color}14`, borderRadius: 8, padding: "5px 10px",
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: def.color, flexShrink: 0, display: "inline-block" }} />
                    {def.label}
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 800, minWidth: 24, textAlign: "center",
                    color: colCards.length > 0 ? def.color : "rgba(0,49,53,0.3)",
                    background: colCards.length > 0 ? `${def.color}14` : "#F5F8F7",
                    padding: "3px 8px", borderRadius: 8,
                  }}>{colCards.length}</span>
                </div>

                {/* Cards */}
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: 8, padding: "0 12px 12px" }}>
                  {colCards.length === 0 ? (
                    <div style={{
                      display: "flex", flexDirection: "column", alignItems: "center",
                      justifyContent: "center", flex: 1, textAlign: "center", padding: "20px 10px",
                      border: `1.5px dashed ${def.color}30`, borderRadius: 10,
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.25, marginBottom: 8, color: def.color }}>
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                        <line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                      <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.32)", fontWeight: 600 }}>Drop cards here</p>
                    </div>
                  ) : colCards.map(card => (
                    <div
                      key={card.id}
                      className="trk-card"
                      draggable
                      onDragStart={() => onDragStart(card.id)}
                      style={{
                        background: "#fff", borderRadius: 10, padding: "11px 12px",
                        boxShadow: `inset 3px 0 0 ${def.color}, 0 1px 3px rgba(0,49,53,0.06)`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                        <div style={{
                          width: 30, height: 30, borderRadius: 8, background: card.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, flexShrink: 0, color: "#003135",
                        }}>
                          {card.initials}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.company}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "rgba(0,49,53,0.45)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{card.role}</p>
                        </div>
                      </div>
                      <p style={{ margin: 0, fontSize: 11, color: "rgba(0,49,53,0.32)", fontWeight: 500 }}>{card.applied}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </>
  )
}
