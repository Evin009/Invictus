"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { companyLogoUrls } from "@/lib/company-logo"

/**
 * Renders a company's brand logo, trying each logo source in turn
 * (Google favicon service → DuckDuckGo icon cache). Falls back to a
 * branded letter tile when every source fails.
 */
export function CompanyLogo({ name, size = 40 }: { name: string; size?: number }) {
  const [srcIdx, setSrcIdx] = useState(0)
  const sources = companyLogoUrls(name)

  // New name → restart the source chain
  useEffect(() => { setSrcIdx(0) }, [name])

  if (sources.length === 0 || srcIdx >= sources.length) {
    return (
      <span title={name} style={{
        width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: "rgba(2,73,80,0.1)", color: "#024950",
        fontSize: size * 0.42, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif",
        textTransform: "uppercase", userSelect: "none",
      }}>
        {name.trim().charAt(0) || "?"}
      </span>
    )
  }

  return (
    <img
      src={sources[srcIdx]}
      alt={name}
      title={name}
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
  )
}
