import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { requireAuth } from "@/lib/require-auth"

export const runtime = "nodejs"

const STATE_COOKIE = "slack_oauth_state"

export async function GET(req: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const clientId = process.env.SLACK_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "SLACK_CLIENT_ID not configured" }, { status: 500 })
  }

  const { origin } = new URL(req.url)
  const redirectUri = `${origin}/api/integrations/slack/callback`
  const state = crypto.randomUUID()

  const cookieStore = await cookies()
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  })

  const authorizeUrl = new URL("https://slack.com/oauth/v2/authorize")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("scope", "incoming-webhook")
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)

  return NextResponse.redirect(authorizeUrl.toString())
}
