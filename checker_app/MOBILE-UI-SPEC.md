# M2C QC Checker — Mobile UI Spec

The single source of truth for restyling every screen in `checker_app`. Derived
from the Dashboard redesign. **Palette = the web checker portal (brand red
`#e01a1b`).** Apply this to all pages; do **not** change any logic, data,
props, navigation, or API behaviour — restyle only.

---

## 0. Golden rules

1. **Never change behaviour.** Only swap presentation (colors, spacing, fonts,
   borders, icons, layout wrappers). Keep all state, handlers, data mapping,
   status logic, and routing exactly as-is.
2. **Borders go on `className`, not inline `style`.** Inline `borderWidth` does
   **not** render on this build. Use `className="border border-slate-200"`
   (shadows/elevation via inline `style` are fine).
3. **No blue accents.** Migrate every `#2563eb` / `blue-*` accent (from earlier
   parity work) to **brand red**. Blue stays only where it's a *semantic status*
   color that mirrors web (e.g. "New Assignment" badge).
4. **Verify:** `npx tsc --noEmit` and `npx eslint <files>` must pass.

---

## 1. Tokens (`src/constants/design.ts`)

- **Primary / brand red:** `brand[500]` `#e01a1b` (600 `#c41617`, 50 `#fff1f1`, 100 `#ffdede`).
- **Success** `#16a34a`/`#15803d`, **info** `#0074c8`, **amber** `#d97706`, **danger** `#dc2626`.
- **Canvas** `#f7f7f5` (`bg-gray-50`), **surface** white.
- **Text:** `colors.text` slate-900 / `colors.textSecondary` slate-600 / `colors.textMuted` slate-500 / `colors.textFaint` slate-400.
- **Border:** `border-slate-200` (className). Import tokens for inline colors: `import { brand, colors, ... } from '@/constants/design'`.
- Spacing 4pt (`space`), radius (`radius`, cards `rounded-2xl`), `elevation` presets, `statusStyle()` for status→color.

## 2. UI kit (`src/components/UI/`)

| Component | Use for |
|---|---|
| `AppText` | **All text.** `variant`: displayLg / headlineLg/md/sm / titleLg/md / bodyLg/md/sm / labelLg/md/sm. `color` prop overrides. Renders in Outfit. |
| `SectionCard` | **Every titled section/card.** Props: `icon` (lucide), `title`, `subtitle?`, `right?`, `children`. Renders the red header + white-circle icon automatically. |
| `Card` | Untitled surface (white, slate-200 border, shadow, rounded-2xl). |
| `StatusBadge` / `Badge` | Status pills. `StatusBadge status="APPROVED"` maps via `statusStyle`. |
| `Button` | Actions. `variant`: primary(red) / secondary / ghost / danger. Icon optional. ≥44px. |

## 3. Section header pattern (the signature look)

Every section card = **primary-red header strip** + **icon in a white circle**
(red icon) + **white title** + translucent-white subtitle + white body below.
Prefer `<SectionCard icon={Factory} title="..." subtitle="...">…</SectionCard>`.
If a bespoke card is needed, replicate: header `bg-brand-500 px-5 py-4`, icon in
`w-10 h-10 bg-white rounded-full` with `color={brand[500]}`, title
`text-white font-bold`, subtitle `text-white/85`.

## 4. Cards & list rows

- **Card:** `bg-white rounded-2xl border border-slate-200` + `style={elevation.card}`.
- **List row:** left = tinted icon chip (`bg-brand-50` rounded, red lucide icon);
  middle = title (slate-900 semibold) + meta (slate-500) + date (calendar icon);
  right = `StatusBadge`. Pressable rows use a subtle pressed bg (`#f8fafc`).
- **KPI/stat cards:** white card + border + shadow; tinted `-50` icon chip with
  `-500/600` icon; **dark slate value**; muted trend. 2-col grid via 48% cells.

## 5. Chrome

- **AppBar:** red `#e01a1b`, white content (already done in `Header.tsx`).
- **Bottom nav:** white bar, red active pill (already done in `(tabs)/_layout.tsx`).
- **Sticky page header:** page title / filters that should stay put go **outside**
  the ScrollView as a fixed block with a `border-b border-slate-200` divider
  (see Dashboard greeting).
- **Status bar:** red area handled by the tab layout.

## 6. States

- **Empty:** slate icon tile (`bg-slate-100`) + slate-900 title + slate-600 hint.
- **Error:** `bg-danger-50` red icon circle + red primary retry button (brand red).
- **Loading:** skeleton blocks (`bg-slate-200`) matching final layout.
- **Pull-to-refresh:** `tintColor={brand[500]}`.

## 7. Icons & type

- **lucide-react-native** only, consistent sizing (18 in chips/section icons, 20–22 in tiles), `strokeWidth` 2–2.25.
- Every section header gets a contextually-apt icon (Factory, Package, FileText, User, Phone, MapPin, ShieldCheck, ClipboardList, …).
- Headings `AppText variant="headline*/title*"`, body `body*`, labels/badges `label*`.

## 8. Buttons

- Primary CTA = red (`Button variant="primary"`). Destructive = `danger`.
  Secondary = white + slate border. All ≥44px tall, `rounded-md`, icon optional.

---

## Rollout order

Vendors list → Products list → Reports list → Vendor detail → Product detail →
Profile → Inspection forms (Vendor/Product steps) → Modals (notifications,
selfie, signature, date-range, report viewers) → Login.
