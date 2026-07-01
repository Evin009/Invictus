import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { SidebarProvider } from "@/components/sidebar-context"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Invictus",
  description: "Autonomous job application system dashboard",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} h-full`}>
      <body className="min-h-full antialiased" style={{ backgroundColor: "var(--background)", position: "relative" }}>

        {/* Liquid glass mesh background */}
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
          {/* Teal orb — top left */}
          <div style={{
            position: "absolute",
            width: "780px",
            height: "780px",
            borderRadius: "50%",
            top: "-260px",
            left: "-180px",
            background: "radial-gradient(circle, oklch(0.540 0.140 195 / 0.28) 0%, transparent 68%)",
            filter: "blur(1px)",
          }} />
          {/* Indigo orb — bottom right */}
          <div style={{
            position: "absolute",
            width: "680px",
            height: "680px",
            borderRadius: "50%",
            bottom: "-180px",
            right: "-120px",
            background: "radial-gradient(circle, oklch(0.420 0.160 268 / 0.22) 0%, transparent 68%)",
            filter: "blur(1px)",
          }} />
          {/* Subtle center orb */}
          <div style={{
            position: "absolute",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            top: "38%",
            left: "42%",
            background: "radial-gradient(circle, oklch(0.460 0.100 240 / 0.10) 0%, transparent 70%)",
            filter: "blur(1px)",
          }} />
        </div>

        {/* App shell */}
        <div className="flex min-h-screen" style={{ position: "relative", zIndex: 1 }}>
          <SidebarProvider>
            <Sidebar />
            <main className="flex-1 min-w-0 overflow-y-auto">
              <div className="max-w-[1100px] mx-auto px-8 py-9">
                {children}
              </div>
            </main>
          </SidebarProvider>
        </div>
      </body>
    </html>
  )
}
