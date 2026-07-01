# Product

## Register

product

## Users

Single user: the developer who built and runs the autonomous job application system. Checks the dashboard between tasks during the day — desktop only, not a mobile use case. Primary mental model: "what did the agent do since I last looked?"

## Product Purpose

A read-mostly operations dashboard for an autonomous AI job application system. The agent runs hourly on a remote server; this UI shows what it found, what it applied to, which replies came in, and lets the user tune its targeting (role keywords, companies, locations) without editing code or running scripts.

Success looks like: user opens the dashboard, gets a clear picture of system activity in under 10 seconds, and can adjust settings without leaving the browser.

## Brand Personality

Confident, modern, premium. The interface reflects competence — the system is doing serious work autonomously, and the dashboard should feel like the control surface of something that works. Not loud. Not decorative. Earned authority through precision and restraint.

## Anti-references

- Jira / Greenhouse / Workable: bureaucratic, cluttered, legacy SaaS gray
- Notion: too soft and editorial for a monitoring tool
- Generic SaaS dashboards with gradient hero metrics, rainbow status chips, and glassmorphism cards
- Warm-cream or sand body backgrounds (the 2026 AI default — avoided intentionally)

## Design Principles

1. **Data is the hierarchy.** Numbers, statuses, and company names are the primary visual elements. No decorative chrome competes with them.
2. **Efficient at a glance.** The user is checking between other tasks. Information density and scannable hierarchy beat elaborate layouts.
3. **Restraint as quality signal.** Premium feels earned through spacing, weight contrast, and precise color use — not through gradients, animations, or elaborate components.
4. **One source of truth per question.** Each screen answers one question clearly. Dashboard: "what happened?" Applications: "what's the pipeline?" Settings: "what are the targets?"

## Accessibility & Inclusion

WCAG AA minimum. Single-user tool on a desktop, but contrast standards are non-negotiable. No color-only status encoding — always pair color with text label.
