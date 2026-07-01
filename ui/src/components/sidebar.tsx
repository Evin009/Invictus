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
        width: collapsed ? "64px" : "216px",
        /* Liquid glass sidebar */
        background: "linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.025) 100%)",
        backdropFilter: "blur(40px) saturate(180%)",
        WebkitBackdropFilter: "blur(40px) saturate(180%)",
        borderRight: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset -1px 0 0 rgba(255,255,255,0.03), 1px 0 24px rgba(0,0,0,0.18)",
        transition: "width 0.32s cubic-bezier(0.32,0.72,0,1)",
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {/* Wordmark */}
      <div
        className="h-[56px] flex items-center shrink-0 overflow-hidden"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: collapsed ? "0 20px" : "0 18px",
          transition: "padding 0.32s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        <div
          className="shrink-0 w-7 h-7 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, oklch(0.720 0.140 195), oklch(0.560 0.120 210))",
            boxShadow: "0 2px 12px oklch(0.680 0.130 195 / 0.40), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
              stroke="white"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
          </svg>
        </div>

        <span
          className="text-[13px] font-semibold tracking-tight ml-2.5 whitespace-nowrap"
          style={{
            color: "oklch(0.930 0.008 210)",
            opacity: collapsed ? 0 : 1,
            transform: collapsed ? "translateX(-6px)" : "translateX(0)",
            transition: "opacity 0.18s ease, transform 0.18s ease",
            pointerEvents: collapsed ? "none" : "auto",
          }}
        >
          Invictus
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5" style={{ padding: "10px 8px" }}>
        {!collapsed && (
          <p
            className="px-3 pt-1 pb-2 text-[9px] font-semibold uppercase whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.25)",
              letterSpacing: "0.16em",
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
              className="group flex items-center rounded-xl text-[13px] font-medium relative overflow-hidden"
              style={{
                gap: collapsed ? 0 : "9px",
                padding: collapsed ? "9px" : "8px 10px",
                justifyContent: collapsed ? "center" : "flex-start",
                background: active
                  ? "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.06) 100%)"
                  : "transparent",
                color: active ? "oklch(0.930 0.008 210)" : "oklch(0.580 0.012 220)",
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(255,255,255,0.08)"
                  : "none",
                transition: "background 0.2s cubic-bezier(0.23,1,0.32,1), color 0.2s ease, box-shadow 0.2s ease, padding 0.32s cubic-bezier(0.32,0.72,0,1), gap 0.32s cubic-bezier(0.32,0.72,0,1)",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"
                  ;(e.currentTarget as HTMLElement).style.color = "oklch(0.820 0.008 210)"
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  ;(e.currentTarget as HTMLElement).style.background = "transparent"
                  ;(e.currentTarget as HTMLElement).style.color = "oklch(0.580 0.012 220)"
                }
              }}
            >
              {/* Active left stripe */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                  style={{
                    width: "3px",
                    height: "16px",
                    background: "linear-gradient(180deg, oklch(0.780 0.140 195), oklch(0.620 0.120 205))",
                    boxShadow: "0 0 8px oklch(0.680 0.130 195 / 0.60)",
                  }}
                />
              )}

              <Icon
                size={15}
                weight={active ? "fill" : "regular"}
                style={{
                  color: active ? "oklch(0.720 0.130 195)" : "inherit",
                  flexShrink: 0,
                  transition: "color 0.2s ease",
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

      {/* Footer */}
      <div
        className="flex flex-col gap-1.5 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)", padding: "10px 8px" }}
      >
        {/* Status */}
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
              style={{ backgroundColor: "oklch(0.720 0.130 195)" }}
            />
            <span
              className="relative inline-flex rounded-full h-1.5 w-1.5"
              style={{ backgroundColor: "oklch(0.720 0.130 195)" }}
            />
          </span>
          <span
            className="text-[11px] whitespace-nowrap"
            style={{
              color: "rgba(255,255,255,0.30)",
              opacity: collapsed ? 0 : 1,
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
          className="flex items-center justify-center rounded-lg w-full transition-premium"
          style={{
            height: "30px",
            color: "rgba(255,255,255,0.28)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"
            ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.28)"
            ;(e.currentTarget as HTMLElement).style.background = "transparent"
          }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed
            ? <ArrowLineRight size={13} weight="regular" />
            : <ArrowLineLeft size={13} weight="regular" />
          }
        </button>
      </div>
    </aside>
  )
}
