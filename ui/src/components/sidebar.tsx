"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SquaresFour, ClipboardText, Sliders, User,
  CaretLeft, CaretRight,
} from "@phosphor-icons/react"
import { useSidebar } from "@/components/sidebar-context"

const NAV = [
  { href: "/dashboard",    label: "Dashboard",    Icon: SquaresFour },
  { href: "/applications", label: "Applications", Icon: ClipboardText },
  { href: "/profile",      label: "Profile",      Icon: User },
  { href: "/settings",     label: "Settings",     Icon: Sliders },
]

export function Sidebar() {
  const pathname = usePathname()
  const { collapsed, toggle } = useSidebar()

  return (
    <aside
      className="shrink-0 flex flex-col relative"
      style={{
        width: collapsed ? "64px" : "220px",
        height: "calc(100vh - 32px)",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        transition: "width 0.38s cubic-bezier(0.32, 0.72, 0, 1)",
        backgroundColor: "var(--sidebar)",
        borderRadius: "1.25rem",
        border: "1px solid var(--sidebar-border)",
        boxShadow: "0 8px 32px oklch(0.118 0.010 228 / 0.22), 0 2px 8px oklch(0.118 0.010 228 / 0.12)",
        overflow: "hidden",
      }}
    >
      {/* Wordmark */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: "58px",
          borderBottom: "1px solid var(--sidebar-border)",
          padding: collapsed ? "0 18px" : "0 20px",
          gap: "10px",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          className="shrink-0 rounded-xl flex items-center justify-center p-[2px]"
          style={{
            width: "28px", height: "28px",
            background: "linear-gradient(145deg, oklch(0.640 0.120 200), oklch(0.480 0.100 210))",
            boxShadow: "0 2px 8px oklch(0.560 0.115 200 / 0.40), inset 0 1px 0 rgba(255,255,255,0.20)",
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

        {!collapsed && (
          <div style={{ opacity: collapsed ? 0 : 1, transition: "opacity 0.2s ease", minWidth: 0 }}>
            <span className="text-[13px] font-semibold tracking-tight block"
              style={{ color: "var(--sidebar-accent-foreground)" }}>
              Invictus
            </span>
            <span className="text-[10px] font-medium"
              style={{ color: "var(--sidebar-foreground)", opacity: 0.5 }}>
              Job Autopilot
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5" style={{ padding: collapsed ? "16px 8px" : "16px 10px" }}>
        {!collapsed && (
          <p className="pb-2 text-[9px] font-semibold uppercase"
            style={{
              paddingLeft: "12px",
              color: "var(--sidebar-foreground)",
              opacity: 0.28,
              letterSpacing: "0.16em",
              transition: "opacity 0.2s ease",
            }}>
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
              className="group relative flex items-center rounded-xl text-[13px] font-medium transition-premium"
              style={{
                gap: collapsed ? 0 : "10px",
                padding: collapsed ? "9px 0" : "9px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                backgroundColor: active ? "var(--sidebar-accent)" : "transparent",
                color: active ? "var(--sidebar-accent-foreground)" : "var(--sidebar-foreground)",
                boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.06)" : "none",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: "3px", height: "18px",
                    background: "linear-gradient(180deg, oklch(0.680 0.130 195), oklch(0.480 0.100 205))",
                    boxShadow: "0 0 10px oklch(0.560 0.115 200 / 0.70)",
                  }}
                />
              )}
              <Icon
                size={15}
                weight={active ? "fill" : "regular"}
                style={{
                  color: active ? "oklch(0.640 0.120 200)" : "var(--sidebar-foreground)",
                  opacity: active ? 1 : 0.45,
                  flexShrink: 0,
                }}
              />
              {!collapsed && label}
            </Link>
          )
        })}
      </nav>

      {/* Status dot + collapse toggle */}
      <div
        className="flex items-center shrink-0"
        style={{
          borderTop: "1px solid var(--sidebar-border)",
          padding: collapsed ? "12px 0" : "12px 20px",
          justifyContent: collapsed ? "center" : "space-between",
          gap: "8px",
        }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-55"
                style={{ backgroundColor: "oklch(0.640 0.120 200)" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: "oklch(0.560 0.115 200)", boxShadow: "0 0 5px oklch(0.560 0.115 200 / 0.50)" }} />
            </span>
            <p className="text-[11px] font-medium" style={{ color: "var(--sidebar-foreground)", opacity: 0.45 }}>
              Running hourly
            </p>
          </div>
        )}

        <button
          onClick={toggle}
          className="flex items-center justify-center rounded-lg transition-premium"
          style={{
            width: "26px", height: "26px",
            backgroundColor: "var(--sidebar-accent)",
            color: "var(--sidebar-foreground)",
            border: "1px solid var(--sidebar-border)",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.7")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <CaretRight size={11} weight="bold" />
            : <CaretLeft size={11} weight="bold" />
          }
        </button>
      </div>
    </aside>
  )
}
