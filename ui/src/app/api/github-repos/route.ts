import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export const runtime = "nodejs"

// Curated job-list repos publish their table in README.md, but the default
// branch varies per repo (SimplifyJobs uses dev, most use main). Resolve the
// real raw URL once at add time so the backend agent never has to guess.
const BRANCH_CANDIDATES = ["main", "dev", "master"]

function parseGithubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.trim().match(/^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+)/i)
  if (!m) return null
  return { owner: m[1], repo: m[2].replace(/\.git$/, "") }
}

async function resolveRawReadme(owner: string, repo: string): Promise<string | null> {
  for (const branch of BRANCH_CANDIDATES) {
    const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`
    try {
      const res = await fetch(raw, { method: "HEAD", signal: AbortSignal.timeout(5000) })
      if (res.ok) return raw
    } catch {
      // try next branch
    }
  }
  return null
}

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db
    .from("github_repos")
    .select("id, repo_url, added_at")
    .order("added_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ repos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const url = typeof body?.url === "string" ? body.url : ""
  const parsed = parseGithubRepo(url)
  if (!parsed) {
    return NextResponse.json({ error: "Not a valid GitHub repo URL" }, { status: 400 })
  }

  const rawReadme = await resolveRawReadme(parsed.owner, parsed.repo)
  if (!rawReadme) {
    return NextResponse.json({ error: "Couldn't find a README in that repo" }, { status: 422 })
  }

  const repoUrl = `https://github.com/${parsed.owner}/${parsed.repo}`
  const db = createClient()
  const { data, error } = await db
    .from("github_repos")
    .upsert({ repo_url: repoUrl, raw_readme_url: rawReadme }, { onConflict: "repo_url" })
    .select("id, repo_url, added_at")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ repo: data })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => null)
  const id = typeof body?.id === "string" ? body.id : ""
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  const db = createClient()
  const { error } = await db.from("github_repos").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
