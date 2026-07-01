import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const table = searchParams.get("table") === "outreach_seeds" ? "outreach_seeds" : "cover_letter_seeds"
  const db = createClient()
  const { data, error } = await db.from(table).select("*").order("label")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  try {
    const { table: rawTable, ...body } = await req.json()
    const table = rawTable === "outreach_seeds" ? "outreach_seeds" : "cover_letter_seeds"
    const db = createClient()
    const { data, error } = await db.from(table).insert(body).select().single()
    if (error) throw error
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { table: rawTable, id } = await req.json()
    const table = rawTable === "outreach_seeds" ? "outreach_seeds" : "cover_letter_seeds"
    const db = createClient()
    await db.from(table).delete().eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
