# Module Parity + Polish Prompt (reusable per module)

Use this to bring one mobile module to EXACT parity with the web QC-checker,
plus apply all the UI/theme fixes established on the vendor module. Fill in the
**MODULE** block, then run (yourself or via agents, one page per agent).

Currently targeting: **PRODUCTS module**.

---

## MODULE FILES

**Web (reference — read only, do NOT edit):**
- List: `frontend/src/components/Checker/Products/Products.tsx`
- Detail/View: `frontend/src/components/Checker/Products/ProductDetail.tsx`
- Inspection: `frontend/src/components/Checker/Products/ProductInspectionForm.tsx` + `frontend/src/components/Checker/Vendor/Steps/PI_Step1..6*` (the PI_* step components the web renders)

**Mobile (edit these):**
- List: `checker_app/src/app/(tabs)/products.tsx`
- Detail/View: `checker_app/src/app/products/[id].tsx`
- Inspection: `checker_app/src/components/Products/ProductInspectionForm.tsx` + `checker_app/src/components/Products/Steps/PI_Step1..6`, `Defects.tsx`, `Documentation.tsx`, `piShared.tsx`, `validation.ts`, `PI_data.ts`

---

## ⚠️ HARD RULES (a prior run corrupted the repo — do NOT repeat)

1. **NEVER run any git command** — no `git stash / checkout / reset / clean / restore / pull`. They wipe concurrent work. Just edit files.
2. **Paths:** use paths relative to the project root `d:\m2c\m2c\checker_app` (e.g. `src/...`) or absolute. Never prefix with `checker_app/` from inside the project (creates a junk nested folder).
3. **Verify** with `npx tsc --noEmit` (run from `checker_app`) and `npx eslint <file>`. Only fix errors in YOUR file; ignore errors in files another agent is editing.
4. **Preserve ALL logic** — data fetching, handlers, navigation params, status derivation, submit payloads. Change only fields/labels/values/sections and presentation.
5. If agents run in parallel, give each **disjoint files** (no two edit the same file). The shared `validation.ts` / `piShared.tsx` must be owned by exactly one agent.

---

## PART 1 — EXACT WEB PARITY (fields / values / labels)

For each page, diff mobile vs web and make mobile identical:
- **ADD** every field/section/column web has that mobile is missing.
- **REMOVE** every mobile-only field/section/column that web does NOT have (e.g. extra sorts, extra sections, duplicate document lists, selfie/GPS). "Remove unwanted mobile things while comparing with web."
- **FIX** mismatches — wrong data under a heading, inverted fields, wrong option lists.
- **MATCH** labels, value formatting, dropdown options, status labels/badges, filter sets, and step names/order **word-for-word** with web.
- When you REMOVE a verification field, also remove its key from `validation.ts`; when you ADD one, register it + add matching validation.
- **Selfie / GPS:** web has NONE (geofence disabled by default). Remove any before/after selfie gate + GPS/location verification from the mobile inspection flow; auto-start the inspection on mount; submit straight through (no selfie payload keys).
- **List page:** match columns (contact person, contact info, IDs, assigned date, status + inspection-status badges), filters (status / inspection-status / state / sort — give each dropdown a DISTINCT default label, never two identical "All Statuses"), and the primary/secondary action button labels/gating.
- **Detail page:** match sections, the completed-summary mode (submitted/approved dates), derived status badges, and history rows; remove mobile-only extras (e.g. Audit Trail if web lacks it).

## PART 2 — UI / THEME (apply the established mobile design system)

- **Palette = brand red `#e01a1b`** (tokens in `src/constants/design.ts`). Migrate EVERY blue chrome accent → brand red: `#2563eb`→`#e01a1b`, `#1d4ed8`→`#c41617`, `#3b82f6`→`#e01a1b`, `bg-blue-*`→`bg-brand-*`, `text-blue-*`→`text-brand-*`, `border-blue-*`→`border-brand-*`. KEEP semantic status colors (green=pass/approved, red=fail/reject, amber=pending) that mirror web.
- **Borders + Button backgrounds/layout via `className`, NOT inline `style`.** Critical NativeWind quirk on this build: inline `borderWidth`/`backgroundColor`/layout in a Pressable `style` (esp. a style-function) does NOT render. Use `className="border border-slate-200"`, and use the shared `Button` (already className-based). Shadows via inline `style={elevation.card}` are fine.
- **Every titled section → `SectionCard`** (from `@/components/UI`) — red header strip + white-circle lucide icon. Section icons are brand red.
- **All text → `AppText`** (Outfit type scale). Statuses → `StatusBadge`. Actions → `Button` (primary=red, ≥44px). Cards → `Card`/`bg-white rounded-2xl border border-slate-200` + shadow.
- **List chrome:** sticky page title with a small **collapse-arrow** (ChevronUp/Down) that toggles the search+filter section via `LayoutAnimation` (see vendors.tsx). Filters are a fixed collapsible section below the title; the card list scrolls beneath.
- **Inspection page theme:** red AppBar header (not black), red active step circles, red Save & Continue (submit may stay green), red exit modal. No blue anywhere in the step files.
- **Inspection scroll:** one ScrollView with a `ref`; on step change AND on failed validation, `scrollTo({ y: 0 })` so the step starts at the top / shows the unfilled fields.
- **Image crop:** in single-image uploads set `allowsEditing: true` (only works with single-select). Multi-select can't crop.
- **Spacing:** list & inspection content `paddingBottom: 24` (no dead space — the tab bar / bottom button bar is already a separate reserved element). Cards `rounded-2xl`, touch targets ≥44px.
- **AppBar / bottom nav** are global (already red) — do not change.

## PART 3 — VERIFY

- `npx tsc --noEmit` → 0 errors. `npx eslint <changed files>` → 0 errors (pre-existing warnings ok).
- Confirm no residual: `grep -rE "blue-|#2563eb|#1d4ed8|#3b82f6" <module step files>` → none.
- Confirm removed mobile-only keys are gone from both the step render AND `validation.ts`.
- Report a per-page before/after: what was ADDED / REMOVED / RELABELED, plus blue→red count and tsc/eslint status.

---

## Rollout order for the whole app
vendor ✅ → **products (now)** → report → dashboard → profile → notification.
Each module: audit (read-only) → list page → detail page → inspection/detail forms → verify.
