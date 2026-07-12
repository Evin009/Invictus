import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"
import { extractText } from "@/lib/extract-text"

// The "primary" cover letter sample — same row a Settings/Profile page edit
// touches (cover_letter_seeds, one row, label "primary"). mode "reuse" means
// the backend edits this exact letter per job; "tone_only" means it's only
// a style reference and a new letter is generated from scratch each time.
const PRIMARY_LABEL = "primary"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db
    .from("cover_letter_seeds")
    .select("id,label,content,mode")
    .order("label")
    .limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ seed: data?.[0] ?? null })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { content, mode } = await req.json()
    if (typeof content !== "string") {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const db = createClient()
    const { data: existing } = await db.from("cover_letter_seeds").select("id").order("label").limit(1)
    const id = existing?.[0]?.id
    const row = { label: PRIMARY_LABEL, content, mode: mode === "reuse" ? "reuse" : "tone_only" }

    const { error } = id
      ? await db.from("cover_letter_seeds").update(row).eq("id", id)
      : await db.from("cover_letter_seeds").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// Upload your own cover letter file — extracts text and saves it as the
// primary sample in "reuse" mode (it's a real letter, not just a tone example).
export async function POST(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const content = (await extractText(Buffer.from(bytes), file.name)).trim()
    if (!content) return NextResponse.json({ error: "Couldn't read any text from that file" }, { status: 400 })

    const db = createClient()
    const { data: existing } = await db.from("cover_letter_seeds").select("id").order("label").limit(1)
    const id = existing?.[0]?.id
    const row = { label: PRIMARY_LABEL, content, mode: "reuse" }

    const { error } = id
      ? await db.from("cover_letter_seeds").update(row).eq("id", id)
      : await db.from("cover_letter_seeds").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, content })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
