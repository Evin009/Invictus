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
      <body className="min-h-full flex antialiased" style={{ backgroundColor: "var(--background)" }}>
        <SidebarProvider>
          <Sidebar />
          <main
            className="flex-1 min-w-0 overflow-y-auto"
            style={{ backgroundColor: "var(--background)" }}
          >
            <div className="max-w-[1100px] mx-auto px-8 py-9">
              {children}
            </div>
          </main>
        </SidebarProvider>
      </body>
    </html>
  )
}
