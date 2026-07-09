"use client"

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react"
import { companyLogoUrl } from "@/lib/company-logo"

/**
 * Renders a company's brand logo (via its website domain). Falls back to a
 * branded letter tile when no logo can be resolved.
 */
export function CompanyLogo({ name, size = 40 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const url = companyLogoUrl(name)

  // New name → give the image another chance
  useEffect(() => { setFailed(false) }, [name])

  if (!url || failed) {
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
      src={url}
      alt={name}
      title={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        width: size, height: size, borderRadius: size * 0.25, flexShrink: 0,
        objectFit: "contain", background: "#fff",
        border: "1px solid rgba(0,49,53,0.08)",
      }}
    />
  )
}
