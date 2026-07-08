"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

/**
 * Animated login illustration — a student studies at his desk while
 * robot agents carry his resume, single-file, into a glowing job portal.
 * All motion is GSAP-driven: entrance choreography once, then idle loops.
 */
export default function LoginScene() {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    const ctx = gsap.context(() => {
      const bots = gsap.utils.toArray<SVGGElement>(".ls-bot")

      if (reduced) {
        // Static composition: spread the bots along the lane, show badges.
        bots.forEach((b, i) => gsap.set(b, { x: 30 + i * 48, autoAlpha: 1 }))
        gsap.set(".ls-badge", { scale: 1, autoAlpha: 1 })
        gsap.set(".ls-check", { autoAlpha: 0 })
        return
      }

      /* ── Entrance — one pass, staggered build ── */
      const enter = gsap.timeline({ defaults: { ease: "power3.out" } })
      enter.from(".ls-window",     { autoAlpha: 0, y: -16, duration: 0.7 }, 0)
      enter.from(".ls-floor",      { scaleX: 0, transformOrigin: "50% 50%", duration: 0.65, ease: "power2.out" }, 0.1)
      enter.from(".ls-kid",        { autoAlpha: 0, x: -16, duration: 0.7 }, 0.3)
      enter.from(".ls-desk-grp",   { autoAlpha: 0, y: 20, duration: 0.7 }, 0.42)
      enter.from(".ls-arm-grp",    { autoAlpha: 0, duration: 0.5 }, 0.7)
      enter.from(".ls-portal-grp", { autoAlpha: 0, y: 20, duration: 0.7 }, 0.55)
      enter.from(".ls-card",       { autoAlpha: 0, y: 16, scale: 0.9, duration: 0.6, stagger: 0.13, ease: "back.out(1.6)" }, 0.75)

      /* ── Character idle ── */
      // Breathing — chest rises from the hips
      gsap.to(".ls-torso", { scaleY: 1.016, transformOrigin: "50% 100%", duration: 2.4, ease: "sine.inOut", yoyo: true, repeat: -1 })
      // Head sway — gentle nod with a hint of rotation, pivots at the neck
      gsap.to(".ls-head", { y: 1.8, rotation: 1.4, transformOrigin: "50% 92%", duration: 2.1, ease: "sine.inOut", yoyo: true, repeat: -1 })
      // Typing — hands alternate in a tight rhythm
      gsap.to(".ls-hand-l", { y: -2.6, duration: 0.13, ease: "sine.inOut", yoyo: true, repeat: -1 })
      gsap.to(".ls-hand-r", { y: -2.6, duration: 0.13, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 0.1 })

      /* ── Desk ambience ── */
      // Screen glow breathes onto the student
      gsap.to(".ls-glow", { opacity: 0.24, duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 })
      gsap.to(".ls-screen-edge", { opacity: 0.55, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 })
      // Coffee steam — wisps rise and dissolve
      gsap.utils.toArray<SVGPathElement>(".ls-steam").forEach((w, i) => {
        gsap.timeline({ repeat: -1, repeatDelay: 0.5, delay: i * 1.2 })
          .fromTo(w, { y: 0, opacity: 0 }, { y: -7, opacity: 0.5, duration: 0.8, ease: "sine.out" })
          .to(w, { y: -20, opacity: 0, duration: 1.5, ease: "sine.in" })
      })
      // Stars twinkle out of phase
      gsap.utils.toArray<SVGElement>(".ls-star").forEach((s, i) => {
        gsap.to(s, { opacity: 0.2, duration: 1.2 + i * 0.4, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.6 })
      })

      /* ── The agent march ── */
      // Conveyor lane crawls forward
      gsap.to(".ls-dash", { strokeDashoffset: -20, duration: 0.9, ease: "none", repeat: -1 })
      // Bots travel the lane; progress offsets keep them evenly spaced
      bots.forEach((bot, i) => {
        gsap.to(bot, {
          repeat: -1, duration: 12, ease: "none",
          keyframes: [
            { x: 0,   autoAlpha: 0, duration: 0 },
            { x: 12,  autoAlpha: 1, duration: 0.7 },
            { x: 168, autoAlpha: 1, duration: 9.9 },
            { x: 190, autoAlpha: 0, duration: 1.4 },
          ],
        }).progress(i / bots.length)
        // Hover bob, slightly different tempo per bot so the line feels alive
        gsap.to(bot.querySelector(".ls-bot-core"), { y: -2.6, duration: 0.48 + i * 0.05, ease: "sine.inOut", yoyo: true, repeat: -1 })
        gsap.to(bot.querySelector(".ls-tip"), { opacity: 0.35, duration: 0.55, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.2 })
      })

      /* ── Portal ── */
      gsap.to(".ls-portal-glow", { opacity: 0.95, duration: 2.2, ease: "sine.inOut", yoyo: true, repeat: -1 })
      gsap.utils.toArray<SVGCircleElement>(".ls-dot").forEach((d, i) => {
        gsap.timeline({ repeat: -1, delay: i * 1.1 })
          .fromTo(d, { y: 0, opacity: 0 }, { opacity: 0.9, y: -12, duration: 0.4, ease: "none" })
          .to(d, { y: -70, opacity: 0, duration: 1.7, ease: "none" })
      })
      // Success check — springs in, drifts up, fades
      gsap.timeline({ repeat: -1, repeatDelay: 1.5 })
        .fromTo(".ls-check", { scale: 0, y: 0, autoAlpha: 1 }, { scale: 1, duration: 0.45, ease: "back.out(2.4)" })
        .to(".ls-check", { y: -26, autoAlpha: 0, duration: 1.05, ease: "power1.in" }, 0.75)

      /* ── Job cards ── */
      gsap.utils.toArray<SVGGElement>(".ls-card").forEach((c, i) => {
        gsap.to(c, { y: -6, duration: 4.4 + i * 0.8, ease: "sine.inOut", yoyo: true, repeat: -1, delay: i * 0.5 })
      })
      gsap.utils.toArray<SVGGElement>(".ls-badge").forEach((b, i) => {
        gsap.timeline({ repeat: -1, repeatDelay: 2.2, delay: 1 + i * 1.7 })
          .fromTo(b, { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.45, ease: "back.out(2)" })
          .to(b, { scale: 0, autoAlpha: 0, duration: 0.35, ease: "power2.in" }, 3.1)
      })
    }, ref)

    return () => ctx.revert()
  }, [])

  return (
    <svg ref={ref} viewBox="0 0 520 540" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <defs>
        <linearGradient id="ls-g-portal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23BCC7" />
          <stop offset="1" stopColor="#0A7680" />
        </linearGradient>
        <linearGradient id="ls-g-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0D454C" />
          <stop offset="1" stopColor="#072F34" />
        </linearGradient>
        <linearGradient id="ls-g-desk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#03565E" />
          <stop offset="1" stopColor="#023F46" />
        </linearGradient>
        <filter id="ls-soft" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#023135" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* ── Night window ── */}
      <g className="ls-window">
        <rect x="58" y="58" width="128" height="104" rx="12" fill="url(#ls-g-window)" stroke="#024950" strokeWidth="5" />
        <line x1="122" y1="62" x2="122" y2="158" stroke="#024950" strokeWidth="3.5" opacity="0.85" />
        <line x1="61" y1="110" x2="183" y2="110" stroke="#024950" strokeWidth="3.5" opacity="0.85" />
        <circle cx="158" cy="90" r="13" fill="#EFF3F1" opacity="0.92" />
        <circle cx="164" cy="86" r="11" fill="#0B3E44" />
        <rect className="ls-star" x="84" y="84" width="5" height="5" rx="1" fill="#EFF3F1" transform="rotate(45 86.5 86.5)" />
        <rect className="ls-star" x="102" y="130" width="4" height="4" rx="1" fill="#EFF3F1" transform="rotate(45 104 132)" />
        <rect className="ls-star" x="140" y="138" width="3.5" height="3.5" rx="1" fill="#EFF3F1" transform="rotate(45 141.7 139.7)" />
      </g>

      {/* ── Floor ── */}
      <g className="ls-floor">
        <line x1="30" y1="505" x2="490" y2="505" stroke="rgba(2,49,53,0.15)" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="155" cy="507" rx="110" ry="6" fill="rgba(2,49,53,0.07)" />
        <ellipse cx="460" cy="507" rx="42" ry="6" fill="rgba(2,49,53,0.07)" />
      </g>

      {/* Conveyor lane */}
      <line className="ls-dash" x1="252" y1="503" x2="442" y2="503" stroke="rgba(2,73,80,0.25)" strokeWidth="2" strokeDasharray="3 7" strokeDashoffset="0" strokeLinecap="round" />

      {/* ── Student — flat vector style, matched to reference art ── */}
      <g className="ls-kid">
        {/* Backpack */}
        <rect x="36" y="466" width="27" height="38" rx="9" fill="#0C7F88" />
        <rect x="41" y="484" width="17" height="14" rx="5" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="1.5" />
        {/* Task chair — tilted backrest, center post, arc base with casters */}
        <rect x="84" y="382" width="11" height="72" rx="5.5" fill="#082F33" transform="rotate(-4 89 418)" />
        <rect x="80" y="448" width="62" height="11" rx="5" fill="#082F33" />
        <rect x="106" y="459" width="6" height="32" rx="2" fill="#082F33" />
        <path d="M90 501 Q109 490 128 501" fill="none" stroke="#082F33" strokeWidth="5" strokeLinecap="round" />
        <circle cx="90" cy="502" r="3" fill="#082F33" />
        <circle cx="128" cy="502" r="3" fill="#082F33" />

        {/* Far leg — darker trousers + shoe, slightly behind */}
        <path d="M104 444 L140 447 Q150 448 150 456 L150 459 Q150 463 143 462.5 L104 460 Z" fill="#3A44AC" />
        <path d="M130 457 L144 457 L142 493 Q142 496 137 496 L134 496 Q130 496 130.2 492 Z" fill="#3A44AC" />
        <path d="M129 494 L129 499 Q129 502.5 134.5 502.5 L154 502.5 Q157 502.5 156.2 499 Q155 495.8 148 494.4 Q139 492.8 134.5 493.2 Q130.5 493.6 129 494 Z" fill="#141B26" />

        {/* Near leg — indigo trousers + navy flat */}
        <path d="M102 442 L150 445 Q162 446 162 456 L162 460 Q162 465 154 464.5 L102 461 Z" fill="#4A55C7" />
        <path d="M148 459 L162 459 L160 495 Q160 498 155 498 L151 498 Q147 498 147 494 Z" fill="#4A55C7" />
        <path d="M146 496 L146 501 Q146 505 152 505 L173 505 Q176.5 505 175.5 501 Q174 497.4 166 495.8 Q156 493.8 151 494.2 Q147 494.6 146 496 Z" fill="#1B2430" />

        {/* Neck */}
        <path d="M124 378 L124 394 L134 393 L134 377 Z" fill="#F2B58B" />
        <path d="M124 381 Q129 384 134 381" fill="none" stroke="#E09E77" strokeWidth="2" opacity="0.8" />

        {/* Torso — mustard long-sleeve, slight forward lean */}
        <path className="ls-torso" d="M100 458 L100 424 Q100 400 118 394 L130 392 Q147 396 149 412 L150 430 Q150 446 146 458 Z" fill="#EFC63E" />
        <path d="M104 444 Q124 450 146 443" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="1.6" strokeLinecap="round" />

        {/* Head — flat vector profile, minimal face */}
        <g className="ls-head">
          {/* Face */}
          <path d="M115 372 Q114 360 121 354 Q129 349 137 353 L143.5 362 L146 367 Q147 369 145 370 L144 373 Q145.5 378 141 381 Q133 384.5 125 381.5 Q116.5 378.5 115 372 Z" fill="#F2B58B" />
          {/* Hair — voluminous swoop, fringe sweeping low over the forehead */}
          <path d="M113 378 Q104 370 105 355 Q107 341 122 339 Q138 337 144 347 Q148 354 146.5 360 L145.5 362 Q137 358 129 358.5 Q119 359 116.5 367 Q114.5 372 113 378 Z" fill="#1B2430" />
          {/* Ear */}
          <ellipse cx="123" cy="370" rx="3" ry="4" fill="#E09E77" />
          <path d="M122 369 Q124 370 123 372" fill="none" stroke="#D08D66" strokeWidth="1" strokeLinecap="round" />
        </g>
      </g>

      {/* Screen glow spilling onto the student */}
      <polygon className="ls-glow" points="254,356 120,348 120,398 240,394" fill="#0FA4AF" opacity="0.1" />

      {/* ── Desk ── */}
      <g className="ls-desk-grp">
        <polygon points="70,409 78,409 75,505 71,505" fill="#023F46" opacity="0.9" />
        <polygon points="234,409 242,409 240,505 236,505" fill="#023F46" opacity="0.9" />
        <rect x="58" y="398" width="196" height="11" rx="5" fill="url(#ls-g-desk)" />
        {/* Coffee mug + steam */}
        <rect x="60" y="384" width="13" height="15" rx="3" fill="#EFF3F1" stroke="#024950" strokeWidth="1.5" />
        <path className="ls-steam" d="M64 378 q3 -5 0 -9" fill="none" stroke="rgba(2,73,80,0.5)" strokeWidth="1.6" strokeLinecap="round" opacity="0" />
        <path className="ls-steam" d="M69 378 q-3 -5 0 -9" fill="none" stroke="rgba(2,73,80,0.5)" strokeWidth="1.6" strokeLinecap="round" opacity="0" />
        {/* Laptop */}
        <rect x="166" y="392" width="70" height="7" rx="2" fill="#003135" />
        <polygon points="234,396 256,354 264,357 242,398" fill="#024950" />
        <line className="ls-screen-edge" x1="252" y1="358" x2="238" y2="394" stroke="#0FA4AF" strokeWidth="2.5" opacity="0.9" />
      </g>

      {/* Arms + typing hands, over the desk — shoulder → elbow → wrist */}
      <g className="ls-arm-grp">
        <path d="M128 394 Q144 409 162 406 Q175 403 186 391" fill="none" stroke="#D9AF2C" strokeWidth="7" strokeLinecap="round" />
        <path d="M122 398 Q134 414 152 411 Q164 408 172 396" fill="none" stroke="#EFC63E" strokeWidth="8" strokeLinecap="round" />
        <circle className="ls-hand-l" cx="174" cy="393" r="4.5" fill="#F2B58B" />
        <circle className="ls-hand-r" cx="188" cy="389" r="4" fill="#F2B58B" />
      </g>

      {/* ── Marching agent bots ── */}
      {[0, 1, 2, 3].map(i => {
        const color = ["#0FA4AF", "#024950", "#964734", "#0C7F88"][i]
        return (
          <g key={i} transform="translate(252 474)">
            <g className="ls-bot" style={{ opacity: 0 }}>
              <ellipse cx="6" cy="28" rx="11" ry="2.5" fill="rgba(2,49,53,0.12)" />
              <g className="ls-bot-core">
                <line x1="0" y1="0" x2="0" y2="-6" stroke={color} strokeWidth="2" strokeLinecap="round" />
                <circle className="ls-tip" cx="0" cy="-8" r="2.4" fill="#23BCC7" />
                <rect x="-9" y="0" width="18" height="17" rx="6" fill={color} />
                <rect x="-6.5" y="3" width="13" height="8" rx="4" fill="#062A2E" />
                <circle cx="-2" cy="7" r="1.6" fill="#23BCC7" />
                <circle cx="4" cy="7" r="1.6" fill="#23BCC7" />
                <rect x="7" y="6" width="5" height="3" rx="1.5" fill={color} />
                {/* Resume document */}
                <rect x="11" y="1" width="13" height="16" rx="2" fill="#fff" stroke="rgba(2,49,53,0.25)" strokeWidth="0.8" />
                <rect x="13" y="4" width="9" height="1.8" rx="0.9" fill="#0FA4AF" />
                <rect x="13" y="7.5" width="7" height="1.8" rx="0.9" fill="rgba(2,49,53,0.4)" />
                <rect x="13" y="11" width="8" height="1.8" rx="0.9" fill="rgba(2,49,53,0.4)" />
              </g>
            </g>
          </g>
        )
      })}

      {/* ── Job portal ── */}
      <g className="ls-portal-grp">
        <rect x="426" y="356" width="68" height="148" rx="20" fill="#003135" />
        <rect className="ls-portal-glow" x="434" y="364" width="52" height="132" rx="15" fill="url(#ls-g-portal)" opacity="0.55" />
        <rect x="434" y="364" width="52" height="132" rx="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
        <circle className="ls-dot" cx="452" cy="478" r="3" fill="#fff" opacity="0" />
        <circle className="ls-dot" cx="468" cy="482" r="2.5" fill="#EFF3F1" opacity="0" />
        <rect x="424" y="330" width="72" height="18" rx="9" fill="#024950" />
        <text x="460" y="342.5" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="1.5" fill="#EFF3F1">JOB BOARDS</text>
      </g>

      {/* Success check above the portal */}
      <g transform="translate(460 318)">
        <g className="ls-check" style={{ opacity: 0 }}>
          <circle r="11" fill="#0FA4AF" />
          <path d="M-4.5 0 l3 3 l6.5 -6.5" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>

      {/* ── Floating job cards ── */}
      {[
        { x: 282, y: 88,  logo: "#964734" },
        { x: 366, y: 168, logo: "#0FA4AF" },
        { x: 272, y: 212, logo: "#024950" },
      ].map((c, i) => (
        <g key={i} transform={`translate(${c.x} ${c.y})`}>
          <g className="ls-card">
            <rect width="92" height="58" rx="10" fill="#fff" stroke="rgba(2,49,53,0.08)" strokeWidth="1" filter="url(#ls-soft)" />
            <circle cx="16" cy="17" r="7" fill={c.logo} />
            <rect x="30" y="12" width="40" height="5" rx="2.5" fill="rgba(2,49,53,0.75)" />
            <rect x="30" y="21" width="28" height="4" rx="2" fill="rgba(2,49,53,0.3)" />
            <g className="ls-badge" style={{ opacity: 0 }}>
              <rect x="12" y="34" width="54" height="16" rx="8" fill="rgba(15,164,175,0.15)" />
              <path d="M20 42 l2.5 2.5 l4.5 -4.5" fill="none" stroke="#0FA4AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <text x="32" y="45" fontFamily="'Space Grotesk', sans-serif" fontSize="8.5" fontWeight="700" fill="#0FA4AF">Applied</text>
            </g>
          </g>
        </g>
      ))}
    </svg>
  )
}
