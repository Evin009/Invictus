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
      className="shrink-0 flex flex-col"
      style={{
        width: "100%",
        height: "calc(100vh - 32px)",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        backgroundColor: "var(--sidebar)",
        borderRadius: "2rem",
        border: "1px solid var(--sidebar-border)",
        boxShadow:
          "0 4px 6px oklch(0.118 0.010 228 / 0.08), " +
          "0 12px 40px oklch(0.118 0.010 228 / 0.18), " +
          "inset 0 1px 0 oklch(1 0 0 / 0.06)",
        overflow: "hidden",
        /* Extra padding on caps to visually respect the 2rem radius */
        paddingTop: "20px",
        paddingBottom: "20px",
      }}
    >
      {/* ── Logo ───────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          padding: collapsed ? "0 0 16px" : "0 16px 16px",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: "10px",
        }}
      >
        <div
          className="shrink-0 rounded-xl flex items-center justify-center p-0.5"
          style={{
            width: "30px", height: "30px",
            background: "linear-gradient(145deg, oklch(0.660 0.125 200), oklch(0.480 0.100 210))",
            boxShadow:
              "0 2px 8px oklch(0.560 0.115 200 / 0.45), " +
              "inset 0 1px 0 rgba(255,255,255,0.22)",
          }}
        >
          <div
            className="w-full h-full rounded-[calc(0.75rem-2px)] flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, oklch(0.600 0.115 200), oklch(0.455 0.095 212))" }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
                stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25"
                stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
        </div>

        {!collapsed && (
          <div style={{ opacity: 1, transition: "opacity 0.18s ease", minWidth: 0 }}>
            <span className="text-[13px] font-semibold tracking-tight block leading-tight"
              style={{ color: "var(--sidebar-accent-foreground)" }}>
              Invictus
            </span>
            <span className="text-[10px] font-medium leading-none"
              style={{ color: "var(--sidebar-foreground)", opacity: 0.45 }}>
              Job Autopilot
            </span>
          </div>
        )}
      </div>

      {/* Thin separator — narrow so it doesn't span full pill width */}
      <div
        style={{
          height: "1px",
          margin: collapsed ? "0 12px 12px" : "0 16px 12px",
          backgroundColor: "var(--sidebar-border)",
        }}
      />

      {/* ── Nav ────────────────────────────── */}
      <nav
        className="flex-1 flex flex-col gap-1"
        style={{ padding: collapsed ? "0 8px" : "0 10px" }}
      >
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="group flex items-center text-[13px] font-medium transition-premium"
              style={{
                gap: collapsed ? 0 : "10px",
                padding: collapsed ? "10px 0" : "10px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderRadius: "9999px",
                backgroundColor: active
                  ? "oklch(0.560 0.115 200 / 0.18)"
                  : "transparent",
                color: active
                  ? "var(--sidebar-accent-foreground)"
                  : "var(--sidebar-foreground)",
                boxShadow: active
                  ? "inset 0 1px 0 oklch(1 0 0 / 0.06), 0 0 0 1px oklch(0.560 0.115 200 / 0.22)"
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "oklch(1 0 0 / 0.05)"
              }}
              onMouseLeave={(e) => {
                if (!active)
                  (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
              }}
            >
              {/* Icon with hover scale via wrapper */}
              <span
                className="shrink-0 flex items-center justify-center transition-premium"
                style={{
                  width: "20px", height: "20px",
                  transform: "scale(1)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "scale(1.18)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.transform = "scale(1)")
                }
              >
                <Icon
                  size={16}
                  weight={active ? "fill" : "duotone"}
                  style={{
                    color: active ? "oklch(0.700 0.130 195)" : "oklch(0.760 0.014 228)",
                    filter: active
                      ? "drop-shadow(0 0 5px oklch(0.560 0.115 200 / 0.60))"
                      : "none",
                    transition: "color 0.18s ease, filter 0.18s ease",
                  }}
                />
              </span>
              {!collapsed && (
                <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Thin separator */}
      <div
        style={{
          height: "1px",
          margin: collapsed ? "12px 12px 0" : "12px 16px 0",
          backgroundColor: "var(--sidebar-border)",
        }}
      />

      {/* ── Footer ─────────────────────────── */}
      <div
        className="flex items-center shrink-0"
        style={{
          marginTop: "12px",
          padding: collapsed ? "0" : "0 16px",
          justifyContent: collapsed ? "center" : "space-between",
          gap: "8px",
        }}
      >
        {!collapsed && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span
                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-50"
                style={{ backgroundColor: "oklch(0.640 0.120 200)" }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{
                  backgroundColor: "oklch(0.560 0.115 200)",
                  boxShadow: "0 0 5px oklch(0.560 0.115 200 / 0.50)",
                }}
              />
            </span>
            <p className="text-[11px] font-medium" style={{ color: "var(--sidebar-foreground)", opacity: 0.38 }}>
              Running hourly
            </p>
          </div>
        )}

        <button
          onClick={toggle}
          className="flex items-center justify-center transition-premium active:scale-[0.92]"
          style={{
            width: "28px", height: "28px",
            borderRadius: "9999px",
            backgroundColor: "oklch(1 0 0 / 0.07)",
            color: "oklch(0.760 0.014 228)",
            border: "1px solid var(--sidebar-border)",
            flexShrink: 0,
            cursor: "pointer",
          }}
          onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "oklch(1 0 0 / 0.12)")
          }
          onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.backgroundColor = "oklch(1 0 0 / 0.07)")
          }
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
