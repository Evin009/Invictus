import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"
import { RESUME_TEMPLATE } from "@/lib/resume-template"

export const runtime = "nodejs"
export const maxDuration = 30

interface WorkEntry {
  employer: string
  title: string
  startDate: string
  endDate: string
  description: string
}

interface StructuredEntry {
  employer: string
  title: string
  startDate: string
  endDate: string
  bullets: string[]
}

interface RequestBody {
  fullName: string
  email: string
  phone: string
  linkedin: string
  github: string
  portfolio: string
  currentLocation: string
  school: string
  degree: string
  major: string
  gpa: string
  gradMonth: string
  gradYear: string
  skills: string[]
  workHistory: WorkEntry[]
  projects: WorkEntry[]
}

const SOURCE_BUCKET = "resumes-source"

function escapeTex(s: string): string {
  return s
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([%&#_{}])/g, "\\$1")
    .replace(/\$/g, "\\$")
}

function buildEducationItems(body: RequestBody): string {
  if (!body.school) return ""
  const degreeLine = [body.degree, body.major].filter(Boolean).join(" in ")
  const dateLine = [body.gradMonth, body.gradYear].filter(Boolean).join(" ")
  const gpaLine = body.gpa ? `, GPA: ${escapeTex(body.gpa)}` : ""
  return `  \\item \\textbf{${escapeTex(body.school)}} -- ${escapeTex(degreeLine)}${gpaLine} (${escapeTex(dateLine)})`
}

function buildSkillsLine(skills: string[]): string {
  return skills.map(escapeTex).join(", ")
}

// Builds the LaTeX ourselves from structured, validated data — Claude only
// ever returns condensed plain-text bullets, never LaTeX. This is what fixes
// conversions silently dropping or garbling entries: there's no LaTeX
// formatting/escaping left for the model to get wrong.
function buildEntriesTex(entries: StructuredEntry[]): string {
  return entries.map(e => {
    const header = [e.title, e.employer].filter(Boolean).join(", ")
    const dates = [e.startDate, e.endDate].filter(Boolean).join(" -- ")
    const bulletLines = (e.bullets ?? [])
      .filter(Boolean)
      .map(b => `      \\item ${escapeTex(b)}`)
      .join("\n")
    return (
      `  \\item \\textbf{${escapeTex(header)}} (${escapeTex(dates)})\n` +
      `    \\begin{itemize}\n${bulletLines}\n    \\end{itemize}`
    )
  }).join("\n")
}

function buildProjectsSection(entries: StructuredEntry[]): string {
  if (entries.length === 0) return ""
  return `\\section*{Projects}\n\\begin{itemize}\n${buildEntriesTex(entries)}\n\\end{itemize}\n`
}

async function condenseEntries(entries: WorkEntry[], client: Anthropic): Promise<StructuredEntry[]> {
  if (entries.length === 0) return []

  const prompt =
    "Condense each work history entry below into 3-5 concise, accomplishment-focused resume bullet " +
    "points written in plain text (no LaTeX, no markdown, no special formatting). Do not invent " +
    "achievements not implied by the description.\n\n" +
    "Return ONLY a JSON array, one object per entry in the same order, each with keys: " +
    'employer, title, startDate, endDate, bullets (array of plain-text strings). Return nothing else.\n\n' +
    `Entries:\n${JSON.stringify(entries, null, 2)}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })
  const block = response.content[0]
  const text = block && block.type === "text" ? block.text.trim() : "[]"
  const cleaned = text.replace(/^```(?:json)?\s*|\s*```$/g, "").trim()

  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) throw new Error("not an array")
    return parsed
  } catch {
    // Fall back to the raw entries with no condensed bullets rather than
    // silently dropping them from the resume entirely.
    return entries.map(e => ({
      employer: e.employer, title: e.title, startDate: e.startDate, endDate: e.endDate,
      bullets: e.description ? [e.description] : [],
    }))
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    const dataRaw = form.get("data") as string | null
    if (!dataRaw) return NextResponse.json({ error: "No data provided" }, { status: 400 })
    const body: RequestBody = JSON.parse(dataRaw)

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 })
    }
    const client = new Anthropic({ apiKey })
    const db = createClient()

    let sourcePdfPath: string | null = null
    if (file) {
      const bytes = await file.arrayBuffer()
      const destPath = `${Date.now()}-${file.name}`
      const { error: uploadError } = await db.storage
        .from(SOURCE_BUCKET)
        .upload(destPath, Buffer.from(bytes), { upsert: true, contentType: file.type || undefined })
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })
      sourcePdfPath = destPath
    }

    const [experience, projects] = await Promise.all([
      condenseEntries(body.workHistory ?? [], client),
      condenseEntries(body.projects ?? [], client),
    ])

    const contactParts = [body.email, body.phone, body.linkedin, body.github, body.portfolio, body.currentLocation]
      .filter(Boolean)
      .map(escapeTex)
    const contactLine = contactParts.join(" \\textbullet\\ ")

    const texContent = RESUME_TEMPLATE
      .replace("{{FULL_NAME}}", escapeTex(body.fullName || ""))
      .replace("{{CONTACT_LINE}}", contactLine)
      .replace("{{EDUCATION_ITEMS}}", buildEducationItems(body))
      .replace("{{EXPERIENCE_ITEMS}}", buildEntriesTex(experience))
      .replace("{{PROJECTS_SECTION}}", buildProjectsSection(projects))
      .replace("{{SKILLS_LINE}}", buildSkillsLine(body.skills ?? []))

    const structured = {
      fullName: body.fullName ?? "",
      email: body.email ?? "",
      phone: body.phone ?? "",
      linkedin: body.linkedin ?? "",
      github: body.github ?? "",
      portfolio: body.portfolio ?? "",
      currentLocation: body.currentLocation ?? "",
      education: {
        school: body.school ?? "", degree: body.degree ?? "", major: body.major ?? "",
        gpa: body.gpa ?? "", gradMonth: body.gradMonth ?? "", gradYear: body.gradYear ?? "",
      },
      skills: body.skills ?? [],
      experience,
      projects,
    }

    const { data: existing } = await db.from("resume_document").select("id").limit(1)
    const id = existing?.[0]?.id
    const row = {
      tex_content: texContent,
      structured,
      source_pdf_path: sourcePdfPath,
      updated_at: new Date().toISOString(),
    }
    const { error } = id
      ? await db.from("resume_document").update(row).eq("id", id)
      : await db.from("resume_document").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
