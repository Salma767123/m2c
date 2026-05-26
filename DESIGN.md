---
name: M2C MarkDowns Design System
colors:
  # ── Brand: 4 colour families + surfaces + error ──
  # Each value maps 1:1 to a Tailwind utility in globals.css @theme inline.
  # Stitch overrides: primary/secondary/neutral = #e01a1b / #16a34a / #111827

  # Primary (red) — primary actions, focus rings, active states
  primary: "#e01a1b"             # bg-brand-500
  on-primary: "#ffffff"
  primary-container: "#fff1f1"   # bg-brand-50 — subtle tinted backgrounds

  # Secondary (green) — completed states, success badges
  # Note: shipping app uses #16a34a (Tailwind green-600), Stitch override matches
  secondary: "#16a34a"           # bg-success-500
  on-secondary: "#ffffff"
  secondary-container: "#ecfdf3" # bg-success-50

  # Tertiary (blue) — info actions, links distinct from primary
  tertiary: "#0074c8"            # bg-tertiary-500
  on-tertiary: "#ffffff"
  tertiary-container: "#f5f7ff"  # bg-tertiary-50

  # Neutral ink — Stitch override = Tailwind gray-900
  ink: "#111827"                 # text-gray-900 — headings
  text: "#374151"                # text-gray-700 — body
  text-muted: "#6b7280"          # text-gray-500 — secondary text

  # Surfaces
  background: "#f7f7f5"          # bg-surface-canvas — page canvas
  surface: "#ffffff"             # bg-white / bg-surface-card — cards, modals, inputs
  outline: "#e5e7eb"             # border-slate-200 — standard 1px border
  outline-variant: "#cbd5e1"     # border-slate-300 — hover border

  # Error
  error: "#ba1a1a"               # text-error-500
  on-error: "#ffffff"
  error-container: "#ffdad6"     # bg-error-50
typography:
  display-lg:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: "600"
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
  headline-sm:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: "400"
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-lg:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 272px
  container_max_width: 1280px
  gutter: 24px
  margin_desktop: 40px
  stack_xs: 4px
  stack_sm: 8px
  stack_md: 16px
  stack_lg: 24px
  stack_xl: 48px

# ── Breakpoints — match Tailwind defaults ──
breakpoints:
  sm: 640px
  md: 768px
  lg: 1024px
  xl: 1280px
  2xl: 1536px

# ── Z-index — semantic layering ──
z-index:
  base: 0
  dropdown: 100         # CountrySelect, CountryDialPicker, etc.
  sticky: 200           # VendorHeader, table sticky rows
  modal-backdrop: 300
  modal: 400
  toast: 500            # Toaster (replaces existing z-50)
  tooltip: 600

# ── Shadows — elevation scale ──
# This system avoids heavy shadows; shadows are reserved for hover & overlays.
shadows:
  card-rest: "0 1px 2px rgba(0,0,0,0.04)"          # shadow-card-rest — almost invisible
  card-hover: "0 4px 12px rgba(0,0,0,0.05)"        # shadow-card-hover — tactile hover feedback
  dropdown: "0 8px 24px rgba(15,23,42,0.08)"       # shadow-dropdown — country picker, menus
  modal: "0 20px 40px rgba(15,23,42,0.16)"         # shadow-modal — modal/dialog overlays

# ── Focus ring — accessible focus indicator (WCAG 2.4.7) ──
# Used on all interactive controls; brand-red at 40% opacity for visibility on
# white surfaces without colliding with error red.
focus-ring:
  width: 2px
  offset: 0
  color: "rgba(224,26,27,0.4)"     # brand-500 / 40%
  classes: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500"

# ── Stitch reference ──
# This MD is authoritative human-readable spec.
# Stitch project: https://stitch.withgoogle.com/projects/10763713512699608848
# Stitch uses Material-3 FIDELITY preset; namedColors are M3-computed siblings
# of the customColor seed (#e01a1b). Override fields supersede them — match
# this MD: overridePrimaryColor=#e01a1b, overrideSecondaryColor=#16a34a,
# overrideNeutralColor=#111827.
stitch:
  project_id: "10763713512699608848"
  override_primary: "#e01a1b"
  override_secondary: "#16a34a"
  override_neutral: "#111827"
---

## Brand & Style

The design system is engineered for a high-efficiency B2B marketplace environment. It balances industrial reliability with a modern, digital-first aesthetic. The personality is professional, transparent, and authoritative, designed to instill confidence in supply chain procurement.

The visual style follows a **Corporate / Modern** approach with **Minimalist** tendencies. It prioritizes clarity over decoration, using generous whitespace to reduce cognitive load during complex transactions. High-contrast typography and a surgical use of brand color guide users through critical workflows without overwhelming the interface.

## Colors

This design system utilizes a high-utility palette rooted in architectural neutrals.

- **Primary Accent:** A vibrant, high-visibility red used exclusively for primary actions, active progress indicators, and brand-critical highlights.
- **Secondary Accent:** A functional success green reserved for completed states, approvals, and positive market indicators.
- **Neutral Hierarchy:** The system uses a tiered grayscale to establish hierarchy. Headings use a near-black for maximum legibility, while descriptions and muted states pull back into grays to maintain visual quiet.
- **Surfaces:** A soft off-white background serves as the canvas, while pure white is used for interactive "Surface" containers (cards, modals, inputs) to create a clear functional distinction.

## Typography

The system uses **Outfit** for all levels to provide a clean, geometric, yet approachable feel. The typography is designed for technical clarity.

- **Headings:** Use Semi-Bold (600) or Bold (700) weights with slightly tightened letter spacing to maintain a structured, editorial look.
- **Body:** Set primarily in Regular (400) weight. Use `body-md` as the standard for marketplace listings and descriptions.
- **Labels:** Used for navigation, table headers, and small metadata. These use a heavier weight (600) and increased letter spacing to ensure readability at small scales.

## Layout & Spacing

The layout follows a structured **Fixed Grid** model optimized for desktop web efficiency.

- **Sidebar:** A fixed 272px vertical navigation bar anchors the left side of the screen. This area manages top-level navigation and vertical progress tracking for multi-step procurement workflows.
- **Main Content:** A 12-column fluid grid system sits within a max-width container of 1280px.
- **Gutter & Margins:** A consistent 24px gutter separates grid columns. External margins are set to 40px to provide generous whitespace around the content area.
- **Rhythm:** An 8px base spacing unit governs all internal padding and margins to ensure mathematical harmony across the UI.

## Elevation & Depth

This design system avoids heavy shadows, instead relying on **Low-contrast outlines** and **Tonal layers** to establish hierarchy.

- **Surface Layering:** Elements are elevated by placing Pure White (`#ffffff`) surfaces on top of the Soft Off-White (`#f7f7f5`) background.
- **Borders:** All cards, inputs, and containers use a subtle 1px border (`#e5e7eb`).
- **Active Elevation:** When an element requires focus (e.g., a hovered card), the border color should darken slightly or a very soft, diffused shadow (0px 4px 12px rgba(0,0,0,0.05)) may be applied to provide tactile feedback without breaking the clean aesthetic.

## Shapes

The shape language is modern and approachable but remains grounded in a professional B2B context.

- **Standard Radius:** 8px (`0.5rem`) is the default for cards, input fields, and standard buttons.
- **Pill Shapes:** Used exclusively for status indicators, chips, and tags to distinguish them from interactive buttons or layout containers.
- **Iconography:** Should utilize a medium stroke weight (1.5px to 2px) with rounded caps and corners to match the UI's geometry.

## Components

Consistent component styling ensures the marketplace feels unified.

- **Buttons:**
  - **Primary:** Solid Vibrant Red with white text. 8px rounded corners.
  - **Secondary:** Transparent background with Subtle Gray border and Near-Black text.
- **Input Fields:** Pure White background, 1px Subtle Gray border, 8px rounded corners. Focus state uses a 1px Primary Red border.
- **Chips & Indicators:** Pill-shaped. Completed states use Success Green with 10% opacity background and solid green text. Active/Progress states use Primary Red.
- **Cards:** Pure White surface, 1px Subtle Gray border, 8px rounded corners, 24px internal padding.
- **Vertical Progress Tracker (Sidebar):** Uses a thin vertical line with circular nodes. Completed nodes are Success Green; active nodes are Primary Red with a subtle outer ring; pending nodes are Muted Gray.
- **Data Tables:** Clean, borderless rows with a 1px bottom divider. Header labels in `label-md` with `text-muted` color.

## Component State Matrix

Every interactive component must define these six states. Reference values map to Tailwind utilities in `globals.css`.

| Component        | Rest                                    | Hover                                  | Focus (keyboard)                                      | Active / Pressed         | Disabled                              | Error                                  |
| ---------------- | --------------------------------------- | -------------------------------------- | ----------------------------------------------------- | ------------------------ | ------------------------------------- | -------------------------------------- |
| Button primary   | `bg-brand-500` white text               | `bg-brand-600`                         | `ring-2 ring-brand-500/40`                            | `bg-brand-700`           | `bg-brand-100 text-slate-400`         | —                                      |
| Button secondary | `bg-slate-100 text-slate-900`           | `bg-slate-200`                         | `ring-2 ring-brand-500/30`                            | `bg-slate-300`           | `opacity-60 cursor-not-allowed`       | —                                      |
| Button outlined  | `bg-white border-slate-300 text-slate-700` | `bg-slate-50 border-slate-400`      | `ring-2 ring-brand-500/30`                            | `bg-slate-100`           | `opacity-60`                          | —                                      |
| Input            | `border-slate-200 bg-white`             | `border-slate-300`                     | `border-brand-500 ring-2 ring-brand-500/40`           | —                        | `bg-slate-50 text-slate-500`          | `border-red-500 bg-red-50`             |
| Textarea         | Same as Input                           | Same as Input                          | Same as Input                                         | —                        | Same as Input                         | Same as Input                          |
| Select (dropdown trigger) | Same as Input                  | `border-slate-300 bg-slate-50`         | Same as Input                                         | open: `border-brand-500` | Same as Input                         | Same as Input                          |
| Chip selected    | `bg-brand-500 text-white`               | `bg-brand-600`                         | `ring-2 ring-brand-500/40`                            | `bg-brand-700`           | `opacity-60`                          | —                                      |
| Chip unselected  | `bg-white border-slate-300 text-slate-700` | `border-slate-400`                  | `ring-2 ring-brand-500/30`                            | —                        | `bg-slate-50 opacity-60`              | `border-red-400`                       |
| Card             | `bg-white border-slate-200 shadow-card-rest` | `shadow-card-hover border-slate-300` | —                                                     | —                        | `opacity-60`                          | `border-red-400`                       |
| Link             | `text-brand-700`                        | `text-brand-600 underline`             | `ring-2 ring-brand-500/30 rounded`                    | `text-brand-800`         | `text-slate-400 cursor-not-allowed`   | —                                      |
| Checkbox         | `border-slate-300 bg-white`             | `border-slate-400`                     | `ring-2 ring-brand-500/40`                            | checked: `bg-brand-500`  | `bg-slate-100 cursor-not-allowed`     | `border-red-500`                       |

**Universal rules:**

- All focus rings use `focus-visible:` (keyboard-only) — never `focus:` (which fires on mouse click too).
- Touch targets ≥ 44 × 44 px (mobile) / ≥ 32 × 32 px (desktop). Use `h-11` for mobile-first; `h-10` for desktop-density forms.
- Transitions: `transition-colors duration-150` on hover; never `transition: all`.
- Disabled state always pairs with `cursor-not-allowed` and an `aria-disabled` or `disabled` attribute.
- Error state must set `aria-invalid="true"` and reference an `aria-describedby` error message.

## Iconography

- **Library:** [Lucide](https://lucide.dev) — matches Outfit's geometric clarity; medium stroke (~1.5–2px).
- **Sizes:** 16px (inline / label), 20px (default UI), 24px (section headers), 32px (hero).
- **Stroke:** medium-weight, rounded caps. Apply `aria-hidden="true"` when paired with a visible text label, `aria-label` when icon-only.

## Wire Map

Each design token in this MD is wired into `frontend/src/app/globals.css` `@theme inline` block and consumed via Tailwind utilities. Workflow for any new token:

1. **Add to this MD first** — declare semantic intent + Tailwind utility name in a comment.
2. **Wire into `globals.css`** — add `--color-*`, `--text-*`, `--z-*`, or `--shadow-*` custom property.
3. **Consume in components** — use the Tailwind utility (`bg-brand-500`, `z-modal`, `text-headline-md`).
4. **Never bypass** — no inline `style={{}}` for colour, no hardcoded hex outside of `@theme inline`.

If a value must drift from this spec (e.g. a one-off marketing page), document the reason inline.
