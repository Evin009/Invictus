import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { companyLogoUrls } from "@/lib/company-logo"

// DuckDuckGo's icon service returns this exact byte-identical flat-gray
// placeholder (not a real icon) for any domain it has nothing for — verified
// via MD5 across several nonexistent domains. There's no HTTP-level signal
// for this (it's served with a 200/404 mixed with a valid decodable image),
// so the only reliable detection is hashing the actual response bytes.
const DDG_PLACEHOLDER_MD5 = "ab1fb25b83d4b333ea661a84bd298b2e"

// Google's favicon service similarly returns a valid tiny 16x16 PNG when it
// has no favicon for a domain — real favicons requested at sz=128 always
// come back larger. Read width straight from the PNG IHDR chunk (bytes
// 16-19, big-endian) rather than pulling in an image-decoding dependency.
function pngWidth(buf: Buffer): number | null {
  const PNG_SIG = "89504e470d0a1a0a"
  if (buf.length < 24 || buf.toString("hex", 0, 8) !== PNG_SIG) return null
  return buf.readUInt32BE(16)
}

export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name") ?? ""
  const urls = companyLogoUrls(name)

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length === 0) continue

      const md5 = crypto.createHash("md5").update(buf).digest("hex")
      if (md5 === DDG_PLACEHOLDER_MD5) continue

      const width = pngWidth(buf)
      if (width !== null && width <= 16) continue

      return new NextResponse(buf, {
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "image/png",
          "Cache-Control": "public, max-age=86400, immutable",
        },
      })
    } catch {
      continue
    }
  }

  return NextResponse.json({ error: "no logo" }, { status: 404 })
}
