import { AppSidebar } from "@/components/app-sidebar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      height: "100vh", width: "100%", background: "#EFF3F1",
      fontFamily: "var(--font-space-grotesk, 'Space Grotesk', sans-serif)",
      color: "#003135", display: "flex", gap: 20,
      overflow: "hidden", padding: 20,
    }}>
      <AppSidebar />
      <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", gap: 18, minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
