"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"

/**
 * Renders a company's brand logo via /api/company-logo, which resolves
 * Google's favicon service and DuckDuckGo's icon cache server-side and
 * filters out their placeholder images (undetectable client-side — see
 * that route for why). Falls back to a wireframe globe icon when neither
 * source has a real logo. Hovering shows the company name in a tooltip.
 */
export function CompanyLogo({ name, size = 40 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const [hovered, setHovered] = useState(false)

  // New name → give the proxy another chance
  useEffect(() => { setFailed(false) }, [name])

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      {failed || !name.trim() ? (
        <span style={{
          width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "rgba(2,73,80,0.07)", border: "1px solid rgba(0,49,53,0.08)",
          boxSizing: "border-box",
        }}>
          <svg width={size * 0.54} height={size * 0.54} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#5B7A7E" strokeWidth="1.3" />
            <ellipse cx="12" cy="12" rx="3.4" ry="9" stroke="#5B7A7E" strokeWidth="1.1" />
            <ellipse cx="12" cy="12" rx="9" ry="3.4" stroke="#5B7A7E" strokeWidth="1.1" />
            <path d="M4 8.3c2.2 1.6 5 2.5 8 2.5s5.8-.9 8-2.5" stroke="#5B7A7E" strokeWidth="1.1" />
            <path d="M4 15.7c2.2-1.6 5-2.5 8-2.5s5.8.9 8 2.5" stroke="#5B7A7E" strokeWidth="1.1" />
          </svg>
        </span>
      ) : (
        <img
          src={`/api/company-logo?name=${encodeURIComponent(name.trim())}`}
          alt={name}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{
            width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
            objectFit: "contain", background: "#fff", padding: 4,
            border: "1px solid rgba(0,49,53,0.08)",
            boxSizing: "border-box",
          }}
        />
      )}

      {hovered && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", whiteSpace: "nowrap",
          background: "#003135", color: "#fff",
          fontSize: 12, fontWeight: 600, fontFamily: "'Space Grotesk', sans-serif",
          padding: "6px 10px", borderRadius: 7,
          boxShadow: "0 6px 16px rgba(0,49,53,0.28)",
          pointerEvents: "none", zIndex: 20,
        }}>
          {name}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderTop: "5px solid #003135",
          }} />
        </span>
      )}
    </span>
  )
}
