import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db.from("user_profile").select("*").limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const {
      full_name, email, phone, linkedin_url, github_url,
      education, work_history, skills,
      current_location, portfolio, major, gpa, grad_month, grad_year,
      work_auth, sponsorship, relocate, work_mode, start_date,
      gender, race, veteran, disability, pronouns,
    } = body
    const allowed = {
      full_name, email, phone, linkedin_url, github_url,
      education, work_history, skills,
      current_location, portfolio, major, gpa, grad_month, grad_year,
      work_auth, sponsorship, relocate, work_mode, start_date,
      gender, race, veteran, disability, pronouns,
    }

    const db = createClient()
    const { data: existing } = await db.from("user_profile").select("id").limit(1)
    const id = existing?.[0]?.id

    const { error } = id
      ? await db.from("user_profile").update(allowed).eq("id", id)
      : await db.from("user_profile").insert(allowed)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
