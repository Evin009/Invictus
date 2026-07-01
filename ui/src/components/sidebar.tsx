"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SquaresFour, ClipboardText, Sliders } from "@phosphor-icons/react"

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: SquaresFour },
  { href: "/applications", label: "Applications", Icon: ClipboardText },
  { href: "/settings",     label: "Settings",     Icon: Sliders },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col min-h-screen"
      style={{
        backgroundColor: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Wordmark */}
      <div
        className="px-5 h-[58px] flex items-center gap-3 shrink-0"
        style={{ borderBottom: "1px solid var(--sidebar-border)" }}
      >
        {/* Double-bezel logo mark */}
        <div
          className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 p-[2px]"
          style={{
            background: "linear-gradient(145deg, oklch(0.640 0.120 200), oklch(0.480 0.100 210))",
            boxShadow: "0 2px 8px oklch(0.560 0.115 200 / 0.35), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <div
            className="w-full h-full rounded-[calc(0.75rem-2px)] flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, oklch(0.600 0.115 200), oklch(0.460 0.095 212))" }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
        </div>

        <div>
          <span
            className="text-[13px] font-semibold tracking-tight block"
            style={{ color: "var(--sidebar-accent-foreground)" }}
          >
            Invictus
          </span>
          <span
            className="text-[10px] font-medium"
            style={{ color: "var(--sidebar-foreground)", opacity: 0.65 }}
          >
            Job Autopilot
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-4 flex flex-col gap-0.5">
        <p
          className="px-3 pb-2 text-[9px] font-semibold uppercase"
          style={{ color: "var(--sidebar-foreground)", opacity: 0.45, letterSpacing: "0.16em" }}
        >
          Monitor
        </p>

        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="group relative flex items-center gap-2.5 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-premium"
              style={{
                backgroundColor: active ? "var(--card)" : "transparent",
                color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              {/* Left teal stripe on active */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: "3px",
                    height: "18px",
                    background: "linear-gradient(180deg, oklch(0.640 0.130 195), oklch(0.480 0.100 205))",
                    boxShadow: "0 0 8px oklch(0.560 0.115 200 / 0.50)",
                  }}
                />
              )}

              <Icon
                size={15}
                weight={active ? "fill" : "regular"}
                style={{
                  color: active ? "oklch(0.540 0.115 200)" : "var(--sidebar-foreground)",
                  opacity: active ? 1 : 0.55,
                  flexShrink: 0,
                  transition: "color 0.2s ease, opacity 0.2s ease",
                }}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Status footer */}
      <div
        className="px-5 py-4 flex items-center gap-2.5"
        style={{ borderTop: "1px solid var(--sidebar-border)" }}
      >
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-55"
            style={{ backgroundColor: "oklch(0.640 0.120 200)" }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ backgroundColor: "oklch(0.560 0.115 200)", boxShadow: "0 0 5px oklch(0.560 0.115 200 / 0.50)" }}
          />
        </span>
        <p className="text-[11px] font-medium" style={{ color: "var(--sidebar-foreground)", opacity: 0.55 }}>
          Running hourly
        </p>
      </div>
    </aside>
  )
}
