import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { SearchBar } from "@/components/search-bar"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full flex gap-4 p-4">
      <SidebarProvider>
        <Sidebar />
        <div
          className="flex-1 min-w-0 flex flex-col rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <header
            className="shrink-0 flex items-center px-8"
            style={{
              height: "58px",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--card)",
            }}
          >
            <SearchBar />
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-[1200px] mx-auto px-8 py-8">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </div>
  )
}
