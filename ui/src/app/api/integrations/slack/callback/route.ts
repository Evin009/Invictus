import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase"

export const runtime = "nodejs"

const STATE_COOKIE = "slack_oauth_state"

interface SlackOAuthResponse {
  ok: boolean
  error?: string
  access_token?: string
  team?: { id: string; name: string }
  incoming_webhook?: { channel: string; channel_id: string; url: string }
}

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(STATE_COOKIE)?.value
  cookieStore.delete(STATE_COOKIE)

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(`${origin}/settings?slack_error=invalid_state`)
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}/settings?slack_error=not_configured`)
  }

  const redirectUri = `${origin}/api/integrations/slack/callback`
  const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })
  const data: SlackOAuthResponse = await tokenRes.json()

  if (!data.ok || !data.incoming_webhook || !data.access_token) {
    return NextResponse.redirect(`${origin}/settings?slack_error=${data.error ?? "oauth_failed"}`)
  }

  const db = createClient()
  const { data: existing } = await db.from("slack_integration").select("id").limit(1)
  const id = existing?.[0]?.id
  const row = {
    team_name: data.team?.name ?? null,
    channel_name: data.incoming_webhook.channel,
    webhook_url: data.incoming_webhook.url,
    access_token: data.access_token,
    connected_at: new Date().toISOString(),
  }
  const { error } = id
    ? await db.from("slack_integration").update(row).eq("id", id)
    : await db.from("slack_integration").insert(row)

  if (error) {
    return NextResponse.redirect(`${origin}/settings?slack_error=save_failed`)
  }

  return NextResponse.redirect(`${origin}/settings?slack_connected=1`)
}
