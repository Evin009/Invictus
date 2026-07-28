"use client"

import { CompanyLogo } from "@/components/company-logo"
import { sourceCategory } from "@/lib/source-category"

// Hover/press CSS for the card + its buttons — any page rendering JobCard
// must inject this once (e.g. via a <style dangerouslySetInnerHTML>).
export const JOB_CARD_CSS = `
  .bj-card {
    transition: transform 0.32s cubic-bezier(0.16,1,0.3,1), box-shadow 0.32s cubic-bezier(0.16,1,0.3,1), border-color 0.32s cubic-bezier(0.16,1,0.3,1);
    cursor: pointer;
  }
  .bj-card:hover { transform: translateY(-4px); box-shadow: 0 1px 2px rgba(2,49,53,0.04), 0 20px 36px -12px rgba(2,49,53,0.16) !important; }
  .bj-card:active { transform: translateY(-1px) scale(0.994); }

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
`

export interface JobCardJob {
  id: string
  url: string
  title: string | null
  company: string | null
  source: string | null
  discovered_at: string | null
  location?: string | null
  job_type?: string | null
  workplace?: string | null
  role_category?: string | null
}

function sourceColor(src: string | null) {
  const category = sourceCategory(src)
  if (category === "Job board")   return "#0FA4AF"
  if (category === "Career page") return "#964734"
  if (category === "GitHub repo") return "#024950"
  return "#9CA3A0"
}

const CARD_TINTS = ["#C9E8E4", "#F4D9C6", "#CFE0F0", "#D7EAC8", "#F6D8DA", "#EBDFC4"]
function cardTint(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return CARD_TINTS[h % CARD_TINTS.length]
}

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

interface Props {
  job: JobCardJob
  isSelected?: boolean
  applied?: boolean
  onSelect?: () => void
  onPass?: (e: React.MouseEvent) => void
  onApply?: (e: React.MouseEvent) => void
}

// The single job-card design used everywhere a discovered job is shown —
// browse-jobs and the dashboard's Top jobs strip both render this, so the
// two never drift apart.
export function JobCard({ job, isSelected = false, applied = false, onSelect, onPass, onApply }: Props) {
  const co = job.company ?? "Unknown"
  return (
    <div
      className="bj-card"
      onClick={onSelect}
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
          {job.source && (
            <span
              title={sourceCategory(job.source)}
              style={{ width: 7, height: 7, borderRadius: "50%", background: sourceColor(job.source), flexShrink: 0 }}
            />
          )}
          <span style={{ fontSize: 10.5, color: "rgba(0,49,53,0.35)", fontWeight: 600, whiteSpace: "nowrap" }}>{timeAgo(job.discovered_at)}</span>
        </div>
      </div>

      {/* Title + company */}
      <p style={{ margin: "0 0 3px", fontSize: 15.5, fontWeight: 700, lineHeight: 1.32, letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {job.title ?? "Untitled"}
      </p>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "rgba(0,49,53,0.48)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {co}
      </p>

      {/* Meta tags */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18, flex: 1, alignContent: "flex-start" }}>
        {job.job_type && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 9px", borderRadius: 8, background: "rgba(150,71,52,0.09)", color: "#964734", letterSpacing: "0.01em" }}>
            {job.job_type}
          </span>
        )}
        {job.role_category && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 8, background: "rgba(2,49,53,0.045)", color: "rgba(0,49,53,0.62)" }}>
            {job.role_category}
          </span>
        )}
        {job.workplace && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 8, background: "rgba(2,49,53,0.045)", color: "rgba(0,49,53,0.62)" }}>
            {job.workplace}
          </span>
        )}
        {job.location && (
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 8, background: "rgba(2,49,53,0.045)", color: "rgba(0,49,53,0.62)", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>
            {job.location}
          </span>
        )}
      </div>

      {/* Pass + Quick apply */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="bj-pass"
          onClick={onPass}
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
          onClick={onApply}
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
}
