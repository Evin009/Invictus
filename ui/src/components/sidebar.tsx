"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SquaresFour,
  ClipboardText,
  Sliders,
  ArrowLineLeft,
  ArrowLineRight,
} from "@phosphor-icons/react"
import { useSidebar } from "@/components/sidebar-context"

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: SquaresFour },
  { href: "/applications", label: "Applications", Icon: ClipboardText },
  { href: "/settings",     label: "Settings",     Icon: Sliders },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className="shrink-0 flex flex-col min-h-screen relative"
      style={{
        width: collapsed ? "64px" : "220px",
        backgroundColor: "var(--sidebar)",
        borderRight: "1px solid var(--sidebar-border)",
        transition: "width 0.32s cubic-bezier(0.32,0.72,0,1)",
        overflow: "hidden",
      }}
    >
      {/* Wordmark */}
      <div
        className="h-[56px] flex items-center shrink-0 overflow-hidden"
        style={{
          borderBottom: "1px solid var(--sidebar-border)",
          padding: collapsed ? "0 20px" : "0 18px",
          transition: "padding 0.32s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {/* Logo mark */}
        <div
          className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.620 0.110 200), oklch(0.520 0.090 210))",
            boxShadow: "0 1px 8px oklch(0.580 0.100 200 / 0.35)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Name — fades out when collapsed */}
        <span
          className="text-[13px] font-semibold tracking-tight ml-2.5 whitespace-nowrap"
          style={{
            color: "var(--sidebar-accent-foreground)",
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(-6px)" : "translateX(0)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
            pointerEvents: collapsed ? "none" : "auto",
          }}
        >
          Invictus
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 flex flex-col gap-0.5" style={{ padding: "12px 8px" }}>
        {!collapsed && (
          <p
            className="px-3 pt-1 pb-2 text-[9px] font-semibold uppercase tracking-[0.18em] whitespace-nowrap"
            style={{
              color: "var(--sidebar-foreground)",
              opacity: 0.3,
              transition: "opacity 0.15s ease",
            }}
          >
            Monitor
          </p>
        )}

        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="group flex items-center rounded-md text-[13px] font-medium relative"
              style={{
                gap: collapsed ? 0 : "9px",
                padding: collapsed ? "9px" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                backgroundColor: active ? "var(--sidebar-accent)" : "transparent",
                color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
                transition: "background-color 0.2s ease, padding 0.32s cubic-bezier(0.32,0.72,0,1), gap 0.32s cubic-bezier(0.32,0.72,0,1)",
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                  style={{
                    height: "18px",
                    backgroundColor: "var(--primary)",
                  }}
                />
              )}

              <Icon
                size={16}
                weight={active ? "fill" : "regular"}
                style={{
                  color: active ? "oklch(0.620 0.110 200)" : "var(--sidebar-foreground)",
                  opacity: active ? 1 : 0.5,
                  flexShrink: 0,
                  transition: "color 0.2s ease, opacity 0.2s ease",
                }}
              />

              <span
                className="whitespace-nowrap"
                style={{
                  opacity: collapsed ? 0 : 1,
                  transform: collapsed ? "translateX(-4px)" : "translateX(0)",
                  pointerEvents: collapsed ? "none" : "auto",
                  overflow: "hidden",
                  maxWidth: collapsed ? 0 : "200px",
                  transition: "opacity 0.18s ease, transform 0.18s ease, max-width 0.32s cubic-bezier(0.32,0.72,0,1)",
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer: status + collapse toggle */}
      <div
        className="flex flex-col gap-2 shrink-0"
        style={{ borderTop: "1px solid var(--sidebar-border)", padding: "10px 8px" }}
      >
        {/* Status dot */}
        <div
          className="flex items-center gap-2 rounded-md px-2 py-1.5"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
              style={{ backgroundColor: "oklch(0.620 0.110 200)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: "oklch(0.620 0.110 200)" }}
            />
          </span>
          <span
            className="text-[11px] whitespace-nowrap"
            style={{
              color: "var(--sidebar-foreground)",
              opacity: collapsed ? 0 : 0.4,
              maxWidth: collapsed ? 0 : "200px",
              overflow: "hidden",
              transition: "opacity 0.15s ease, max-width 0.32s cubic-bezier(0.32,0.72,0,1)",
              pointerEvents: "none",
            }}
          >
            Running hourly
          </span>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-md w-full"
          style={{
            height: "30px",
            color: "var(--sidebar-foreground)",
            opacity: 0.35,
            backgroundColor: "transparent",
            border: "none",
            cursor: "pointer",
            transition: "opacity 0.15s ease, background-color 0.15s ease",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.opacity = "0.7"
            ;(e.currentTarget as HTMLElement).style.backgroundColor = "var(--sidebar-accent)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.opacity = "0.35"
            ;(e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ArrowLineRight size={13} weight="regular" />
          ) : (
            <ArrowLineLeft size={13} weight="regular" />
          )}
        </button>
      </div>
    </aside>
  )
}
