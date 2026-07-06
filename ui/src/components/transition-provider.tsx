"use client"

import { createContext, useCallback, useContext, useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import gsap from "gsap"

interface TransitionCtx {
  navigate: (href: string) => void
  mainRef: React.RefObject<HTMLElement | null>
}

const Ctx = createContext<TransitionCtx>({ navigate: () => {}, mainRef: { current: null } })

export function TransitionProvider({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const mainRef  = useRef<HTMLElement>(null)
  const pending  = useRef(false)

  // Enter animation whenever pathname changes
  useEffect(() => {
    if (!mainRef.current) return
    gsap.fromTo(
      mainRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.48, ease: "power3.out", clearProps: "transform,opacity" }
    )
    pending.current = false
  }, [pathname])

  const navigate = useCallback((href: string) => {
    if (pending.current || pathname === href || !mainRef.current) {
      if (pathname !== href) router.push(href)
      return
    }
    pending.current = true
    gsap.to(mainRef.current, {
      opacity: 0, y: -14, duration: 0.22, ease: "power2.in",
      onComplete: () => router.push(href),
    })
  }, [router, pathname])

  return (
    <Ctx.Provider value={{ navigate, mainRef }}>
      {children}
    </Ctx.Provider>
  )
}

export function usePageTransition() {
  return useContext(Ctx)
}
