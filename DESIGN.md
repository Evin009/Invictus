# Design System

## Color Palette

Strategy: **Restrained**. Pure white content surface. Dark sidebar. One teal primary carries all brand identity. Status colors are semantic only.

```css
/* Core */
--color-bg:         oklch(1.000 0.000 0);       /* pure white content area */
--color-surface:    oklch(0.975 0.000 0);        /* panels, table headers, inputs */
--color-border:     oklch(0.910 0.003 220);      /* subtle cool-tinted dividers */
--color-ink:        oklch(0.120 0.006 220);      /* body text — >7:1 on bg */
--color-muted:      oklch(0.480 0.005 220);      /* secondary text — >4.5:1 on bg */

/* Brand */
--color-primary:    oklch(0.580 0.100 200);      /* teal — active states, links, badges */
--color-primary-fg: oklch(1.000 0.000 0);        /* white text on primary fill */

/* Sidebar (dark) */
--color-sidebar-bg:      oklch(0.108 0.010 222); /* near-black, slight navy */
--color-sidebar-surface: oklch(0.160 0.010 222); /* hover / active item bg */
--color-sidebar-text:    oklch(0.640 0.006 222); /* muted nav labels */
--color-sidebar-active:  oklch(0.960 0.000 0);   /* active nav label */
--color-sidebar-border:  oklch(0.200 0.008 222); /* sidebar dividers */

/* Semantic status */
--color-status-applied-bg:   oklch(0.930 0.040 200); /* teal tint */
--color-status-applied-fg:   oklch(0.320 0.100 200);
--color-status-interview-bg: oklch(0.930 0.060 145); /* green tint */
--color-status-interview-fg: oklch(0.300 0.120 145);
--color-status-rejection-bg: oklch(0.940 0.045 15);  /* red tint */
--color-status-rejection-fg: oklch(0.360 0.140 15);
--color-status-ghosted-bg:   oklch(0.930 0.000 0);   /* neutral */
--color-status-ghosted-fg:   oklch(0.420 0.000 0);
--color-status-pending-bg:   oklch(0.940 0.065 75);  /* amber tint */
--color-status-pending-fg:   oklch(0.360 0.130 75);
```

## Typography

Single family: **Inter** (system-ui fallback). No display/body split needed for product UI.

Scale (rem, fixed — no fluid clamp in app UI):
- `text-xs`:   0.75rem / 1rem — labels, metadata
- `text-sm`:   0.875rem / 1.25rem — table cells, secondary text
- `text-base`: 1rem / 1.5rem — body, nav items
- `text-lg`:   1.125rem / 1.75rem — section headings
- `text-2xl`:  1.5rem / 2rem — page titles
- `text-3xl`:  1.875rem / 2.25rem — stat numbers

Weight contrast: 400 (body/muted), 500 (nav labels, table headers), 600 (headings, stat numbers).

## Layout

- Sidebar: 224px fixed width, full height, dark
- Content: flex-1, min-w-0, overflow-y-auto, p-8
- Max content width: 1200px
- Sidebar + content always visible on desktop (no collapse at target sizes)

## Spacing

8px base grid. Key values: 4, 8, 12, 16, 24, 32, 40, 48, 64.

## Components

**Stat card:** borderless surface panel, number in text-3xl/600, label in text-sm/muted. No icon, no sparkline. Data speaks.

**Status badge:** filled pill (px-2.5 py-0.5 rounded-full text-xs font-medium). Color per semantic tokens above.

**Table:** border-collapse, 1px border on container, border-b between rows. Header: surface bg, text-sm/500. Rows: text-sm, hover:surface.

**Sidebar nav item:** full-width button, px-3 py-2 rounded-md, muted text default, sidebar-surface bg + active-text on hover/active.

**Button (primary):** bg-ink text-white, hover brightness-110. Precise, no rounded-full.

## Motion

150-200ms ease-out on hover/focus state changes only. No page-load sequences. Sidebar active indicator transitions opacity.

## Borders and Radius

- Cards/containers: `rounded-lg` (8px), 1px border using --color-border
- Badges: `rounded-full`
- Buttons: `rounded-md` (6px)
- Inputs: `rounded-md`, 1px border
