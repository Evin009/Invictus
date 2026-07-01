"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SquaresFour,
  ClipboardText,
  Sliders,
} from "@phosphor-icons/react"

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: SquaresFour },
  { href: "/applications", label: "Applications", Icon: ClipboardText },
  { href: "/settings",     label: "Settings",     Icon: Sliders },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-[224px] shrink-0 flex flex-col min-h-screen"
      style={{
        backgroundColor: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
      }}
    >
      {/* Wordmark */}
      <div
        className="px-5 h-[60px] flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: "var(--primary)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
        <span
          className="text-[13px] font-semibold tracking-tight"
          style={{ color: "var(--sidebar-accent-foreground)" }}
        >
          Invictus
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        <p
          className="px-3 pt-1 pb-2 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.35 }}
        >
          Monitor
        </p>
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-premium"
              style={{
                backgroundColor: active ? "var(--sidebar-accent)" : "transparent",
                color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
              }}
            >
              <Icon
                size={16}
                weight={active ? "fill" : "regular"}
                style={{
                  color: active ? "var(--primary)" : "var(--sidebar-foreground)",
                  opacity: active ? 1 : 0.6,
                  transition: "color 0.2s ease, opacity 0.2s ease",
                  flexShrink: 0,
                }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* System status */}
      <div
        className="px-5 py-4 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
            style={{ backgroundColor: "oklch(0.580 0.100 200)" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "oklch(0.580 0.100 200)" }}
          />
        </span>
        <p
          className="text-[11px]"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.45 }}
        >
          Running hourly
        </p>
      </div>
    </aside>
  )
}
