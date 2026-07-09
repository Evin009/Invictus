"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { companyLogoUrls } from "@/lib/company-logo"

/**
 * Renders a company's brand logo, trying each logo source in turn
 * (Google favicon service → DuckDuckGo icon cache). Falls back to a
 * branded letter tile when every source fails. Hovering either shows
 * the company name in a small tooltip.
 */
export function CompanyLogo({ name, size = 40 }: { name: string; size?: number }) {
  const [srcIdx, setSrcIdx] = useState(0)
  const [hovered, setHovered] = useState(false)
  const sources = companyLogoUrls(name)

  // New name → restart the source chain
  useEffect(() => { setSrcIdx(0) }, [name])

  const failed = sources.length === 0 || srcIdx >= sources.length

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
    >
      {failed ? (
        <span style={{
          width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "rgba(2,73,80,0.07)", border: "1px solid rgba(0,49,53,0.08)",
          boxSizing: "border-box",
        }}>
          <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="#5B7A7E" strokeWidth="1.6" />
            <ellipse cx="12" cy="12" rx="4" ry="9" stroke="#5B7A7E" strokeWidth="1.6" />
            <line x1="3" y1="12" x2="21" y2="12" stroke="#5B7A7E" strokeWidth="1.6" />
            <path d="M4.5 7.5h15M4.5 16.5h15" stroke="#5B7A7E" strokeWidth="1.6" />
          </svg>
        </span>
      ) : (
        <img
          src={sources[srcIdx]}
          alt={name}
          width={size}
          height={size}
          onError={() => setSrcIdx(i => i + 1)}
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
