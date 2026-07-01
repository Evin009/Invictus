import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"
import { SearchBar } from "@/components/search-bar"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" })

export const metadata: Metadata = {
  title: "Invictus",
  description: "Autonomous job application system dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full flex antialiased" style={{ backgroundColor: "var(--background)" }}>
        <SidebarProvider>
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Top search bar */}
            <header
              className="shrink-0 flex items-center px-8"
              style={{
                height: "58px",
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--card)",
                boxShadow: "0 1px 0 var(--border)",
              }}
            >
              <SearchBar />
            </header>

            <main className="flex-1 overflow-y-auto">
              <div className="max-w-[1200px] mx-auto px-8 py-8">
                {children}
              </div>
            </main>
          </div>
        </SidebarProvider>
      </body>
    </html>
  )
}
