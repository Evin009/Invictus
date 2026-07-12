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

function buildSkillsLine(body: RequestBody): string {
  return body.skills.map(escapeTex).join(", ")
}

async function generateEntryBullets(entries: WorkEntry[], client: Anthropic): Promise<string> {
  if (entries.length === 0) return ""

  const prompt =
    "You are formatting resume entries into LaTeX. For each entry below, produce exactly one " +
    "top-level \\item containing a bold header line (title, employer, dates) followed by a nested " +
    "itemize environment with one \\item per accomplishment bullet, condensed from the raw description. " +
    "Do not add \\documentclass, \\usepackage, \\section, or any packages/layout — output ONLY the " +
    "\\item blocks. Escape LaTeX special characters (%, &, #, _, $) in all text. Return only the raw " +
    "LaTeX, no commentary, no code fences.\n\n" +
    `Entries:\n${JSON.stringify(entries, null, 2)}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{ role: "user", content: prompt }],
  })
  const block = response.content[0]
  const text = block && block.type === "text" ? block.text.trim() : ""
  return text.replace(/^```(?:latex|tex)?\s*|\s*```$/g, "").trim()
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

    const contactParts = [body.email, body.phone, body.linkedin, body.github, body.portfolio, body.currentLocation]
      .filter(Boolean)
      .map(escapeTex)
    const contactLine = contactParts.join(" \\textbullet\\ ")

    const experienceItems = await generateEntryBullets(body.workHistory ?? [], client)

    const texContent = RESUME_TEMPLATE
      .replace("{{FULL_NAME}}", escapeTex(body.fullName || ""))
      .replace("{{CONTACT_LINE}}", contactLine)
      .replace("{{EDUCATION_ITEMS}}", buildEducationItems(body))
      .replace("{{EXPERIENCE_ITEMS}}", experienceItems)
      .replace("{{SKILLS_LINE}}", buildSkillsLine(body))

    const { data: existing } = await db.from("resume_document").select("id").limit(1)
    const id = existing?.[0]?.id
    const row = {
      tex_content: texContent,
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
