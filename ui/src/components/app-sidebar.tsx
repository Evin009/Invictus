"use client"

import { useMemo, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

const CSS = `
  .sb-item:hover { background: rgba(0,49,53,0.06) !important; }
  .sb-logout:hover { background: rgba(0,49,53,0.06) !important; }
`

const NAV = [
  {
    label: "Dashboard", href: "/dashboard",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="13" y="3" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="13" y="13" width="8" height="8" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>`,
  },
  {
    label: "Browse jobs", href: "/browse-jobs",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    label: "Tracker", href: "/tracker",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="5" y="4" width="14" height="17" rx="2" stroke="currentColor" stroke-width="2"/><path d="M9 3h6v3H9z" stroke="currentColor" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    label: "Profile", href: "/profile", spacer: true,
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  },
  {
    label: "Settings", href: "/settings",
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.6a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 000 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 002 1.2L10 21h4l.5-2.6a7 7 0 002-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  },
]

export function AppSidebar() {
  const router   = useRouter()
  const pathname = usePathname()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const [collapsed, setCollapsed] = useState(false)

  async function logout() {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const iconWrap: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, width: 20,
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div style={{
        width: collapsed ? 76 : 250, flexShrink: 0,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 1px 3px rgba(0,49,53,0.06)",
        display: "flex", flexDirection: "column",
        padding: "18px 16px",
        height: "100%", overflow: "hidden",
      }}>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <svg viewBox="0 0 100 100" width={22} height={22} style={{ flexShrink: 0 }}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 17, fontWeight: 700, whiteSpace: "nowrap", opacity: collapsed ? 0 : 1, transition: "opacity 0.15s ease" }}>Invictus</span>
          </div>
          <span
            onClick={() => setCollapsed(p => !p)}
            style={{ cursor: "pointer", color: "rgba(0,49,53,0.35)", flexShrink: 0, display: "flex", alignItems: "center", padding: 4, borderRadius: 6, transition: "background 0.15s ease" }}
          >
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </span>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {NAV.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <div
                key={item.href}
                className="sb-item"
                onClick={() => router.push(item.href)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "11px 12px", borderRadius: 10, cursor: "pointer",
                  background: active ? "rgba(150,71,52,0.1)" : "transparent",
                  color: active ? "#964734" : "rgba(0,49,53,0.6)",
                  marginTop: item.spacer ? 14 : 0,
                  transition: "background 0.15s ease",
                }}
              >
                <span style={iconWrap} dangerouslySetInnerHTML={{ __html: item.icon }} />
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", opacity: collapsed ? 0 : 1, transition: "opacity 0.15s ease", pointerEvents: collapsed ? "none" : "auto" }}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Logout */}
        <div
          className="sb-logout"
          onClick={logout}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "11px 12px", paddingTop: 16,
            borderRadius: 10, cursor: "pointer",
            color: "rgba(0,49,53,0.5)",
            marginTop: 4, borderTop: "1px solid rgba(0,49,53,0.08)",
            transition: "background 0.15s ease",
          }}
        >
          <span style={iconWrap}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 17l5-5-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", opacity: collapsed ? 0 : 1, transition: "opacity 0.15s ease" }}>Log out</span>
        </div>

      </div>
    </>
  )
}
