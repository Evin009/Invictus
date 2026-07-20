"use client"

import { useEffect, useRef, useState } from "react"

interface Repo {
  id: string
  repo_url: string
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
  animation: "grc-shimmer 1.4s ease infinite",
  borderRadius: 6,
}

function repoName(url: string) {
  return url.replace(/^https?:\/\/(www\.)?github\.com\//i, "")
}

// Curated GitHub job-list repos (SimplifyJobs-style README tables) that the
// discovery agent checks on its broad-scan cycle. Managed here, stored in
// the github_repos table, read by the backend search agent.
export function GithubReposCard() {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [repos, setRepos] = useState<Repo[]>([])
  const [repoUrl, setRepoUrl] = useState("")
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch("/api/github-repos")
      .then(r => r.json())
      .then(d => setRepos(Array.isArray(d?.repos) ? d.repos : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  async function addRepo() {
    const url = repoUrl.trim()
    if (!url) return
    setAdding(true)
    const res = await fetch("/api/github-repos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).then(r => r.json()).catch(() => null)
    setAdding(false)

    if (!res?.repo) {
      flash(res?.error ?? "Couldn't add that repo")
      return
    }
    setRepoUrl("")
    setRepos(prev => prev.some(r => r.id === res.repo.id) ? prev : [...prev, res.repo])
  }

  async function removeRepo(id: string) {
    setRepos(prev => prev.filter(r => r.id !== id))
    const res = await fetch("/api/github-repos", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => null)
    if (!res?.ok) flash("Couldn't remove — try again")
  }

  if (loading) {
    return (
      <div style={CARD}>
        <style dangerouslySetInnerHTML={{ __html: "@keyframes grc-shimmer { 0%{background-position:100% 0} 100%{background-position:0 0} }" }} />
        <div style={{ ...SHIMMER, height: 17, width: 180, marginBottom: 18 }} />
        <div style={{ ...SHIMMER, height: 14, width: "70%", marginBottom: 10 }} />
        <div style={{ ...SHIMMER, height: 14, width: "55%" }} />
      </div>
    )
  }

  return (
    <div style={CARD}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Monitored job repos</h2>
        <span onClick={() => setEditing(p => !p)} style={{ fontSize: 13, fontWeight: 700, color: "#964734", cursor: "pointer" }}>
          {editing ? "Done" : "Edit"}
        </span>
      </div>

      {toast && (
        <p style={{ fontSize: 12, color: "#964734", margin: "0 0 14px" }}>{toast}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {repos.length > 0 ? repos.map(repo => (
          <div key={repo.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#F5F8F7", borderRadius: 10 }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="#003135" style={{ flexShrink: 0 }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            <a
              href={repo.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, fontSize: 13, fontWeight: 600, color: "#024950", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              {repoName(repo.repo_url)}
            </a>
            {editing && (
              <span
                onClick={() => removeRepo(repo.id)}
                style={{ width: 17, height: 17, borderRadius: "50%", background: "#003135", color: "#fff", fontSize: 11, lineHeight: "17px", textAlign: "center", cursor: "pointer", userSelect: "none", flexShrink: 0 }}
              >×</span>
            )}
          </div>
        )) : (
          <div style={{ textAlign: "center", padding: "28px 20px", border: "1.5px dashed rgba(0,49,53,0.12)", borderRadius: 10 }}>
            <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700 }}>No repos monitored</p>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(0,49,53,0.45)" }}>Add curated job-list repos and the agent will check them for new postings.</p>
          </div>
        )}
      </div>

      {editing && (
        <>
          <input
            className="pf-input" type="text" placeholder="https://github.com/owner/repo" value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && repoUrl.trim() && !adding) { e.preventDefault(); addRepo() } }}
            style={{ ...INPUT, marginTop: 16 }}
            disabled={adding}
          />
          <button
            onClick={addRepo}
            disabled={adding || !repoUrl.trim()}
            style={{ marginTop: 14, padding: "11px 20px", borderRadius: 20, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: adding ? "default" : "pointer", opacity: adding ? 0.6 : 1 }}
          >
            {adding ? "Checking repo…" : "+ Add repo"}
          </button>
        </>
      )}
    </div>
  )
}
