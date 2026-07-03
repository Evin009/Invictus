"use client"

import { createContext, useContext, useState, useEffect } from "react"

interface SidebarCtx {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarCtx>({ collapsed: false, toggle: () => {} })

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem("sidebar-collapsed") === "true") setCollapsed(true)
    } catch {}
  }, [])

  const toggle = () =>
    setCollapsed((v) => {
      const next = !v
      try { localStorage.setItem("sidebar-collapsed", String(next)) } catch {}
      return next
    })

  return (
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: collapsed ? "68px 1fr" : "224px 1fr",
          gap: "16px",
          minHeight: "100%",
          transition: "grid-template-columns 0.40s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
