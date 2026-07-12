import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

const SOURCE_BUCKET = "resumes-source"
const TAILORED_BUCKET = "resumes"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db
    .from("resume_document")
    .select("id,tex_content,source_pdf_path,updated_at")
    .limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const row = data?.[0] ?? null
  let sourceUrl: string | null = null
  if (row?.source_pdf_path) {
    const { data: signed } = await db.storage
      .from(SOURCE_BUCKET)
      .createSignedUrl(row.source_pdf_path, 60 * 10)
    sourceUrl = signed?.signedUrl ?? null
  }

  // Real tailored PDFs the agent has already compiled and submitted per job —
  // "how it gets submitted" is these, not the raw LaTeX source.
  const { data: recentApps } = await db
    .from("applications")
    .select("title,company,submitted_at,resume_pdf_path")
    .not("resume_pdf_path", "is", null)
    .order("submitted_at", { ascending: false })
    .limit(5)

  const recentSubmissions = await Promise.all(
    (recentApps ?? []).map(async (app) => {
      const { data: signed } = await db.storage
        .from(TAILORED_BUCKET)
        .createSignedUrl(app.resume_pdf_path as string, 60 * 10)
      return {
        title: app.title,
        company: app.company,
        submittedAt: app.submitted_at,
        url: signed?.signedUrl ?? null,
      }
    })
  )

  return NextResponse.json({ resume: row, sourceUrl, recentSubmissions: recentSubmissions.filter(s => s.url) })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { tex_content } = await req.json()
    if (typeof tex_content !== "string" || !tex_content.trim()) {
      return NextResponse.json({ error: "tex_content is required" }, { status: 400 })
    }

    const db = createClient()
    const { data: existing } = await db.from("resume_document").select("id").limit(1)
    const id = existing?.[0]?.id
    const row = { tex_content, updated_at: new Date().toISOString() }

    const { error } = id
      ? await db.from("resume_document").update(row).eq("id", id)
      : await db.from("resume_document").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
