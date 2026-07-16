import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/require-auth"
import { careersUrlOverride, guessCareersUrlCandidates } from "@/lib/careers-url"

export const runtime = "nodejs"

async function isReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; InvictusBot/1.0)" },
    })
    return res.ok
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const name = req.nextUrl.searchParams.get("name") ?? ""
  if (!name.trim()) return NextResponse.json({ url: null })

  const override = careersUrlOverride(name)
  if (override) return NextResponse.json({ url: override })

  const candidates = guessCareersUrlCandidates(name)
  for (const url of candidates) {
    if (await isReachable(url)) {
      return NextResponse.json({ url })
    }
  }

  return NextResponse.json({ url: null })
}
