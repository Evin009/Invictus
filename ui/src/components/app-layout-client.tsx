"use client"

import { AppSidebar } from "./app-sidebar"
import { TransitionProvider, usePageTransition } from "./transition-provider"

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { mainRef } = usePageTransition()
  return (
    <div style={{
      height: "100vh", width: "100%", background: "#EFF3F1",
      fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
      color: "#003135", display: "flex", gap: 20,
      overflow: "hidden", padding: 20,
    }}>
      <AppSidebar />
      <main ref={mainRef as React.RefObject<HTMLElement>} style={{
        flex: 1, overflow: "hidden", display: "flex",
        flexDirection: "column", gap: 18, minWidth: 0,
      }}>
        {children}
      </main>
    </div>
  )
}

export function AppLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <TransitionProvider>
      <LayoutInner>{children}</LayoutInner>
    </TransitionProvider>
  )
}
