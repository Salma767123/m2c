# Porting the 13-Aug frontend changes into `checker_app`

Source: `1efbf3f` + `0df77dc` on `origin/feat/order-currency-correctness`
(pulled into the working tree on 2026-08-13, **not committed**).

This document is a survey only — **no checker_app file has been edited yet.**
Read it, tell me which numbered items to do, and I'll implement those.

---

## Summary

| # | Change | Mobile today | Verdict | Size |
|---|--------|--------------|---------|------|
| 1 | Geofence accepts warehouse **or** factory | — | **No work needed** | — |
| 2 | Flat-error-shape fix in service | Partly broken | **Should fix** | XS |
| 3 | Geofence block → warning card + retry | Errors swallowed | **Needs your call** | M |
| 4 | Product inspection draft / resume | Does not exist | **Needs your call** | L |
| 5 | Duration (active/paused/total) in reports | Does not exist | **Needs your call** | M |
| 6 | "N fields need to be completed" toast | Shows first error only | **Should do** | S |
| 7 | Carton / Bale toggle on test groups | Not present | **Should do** | S |
| 8 | Variants section moved above Measurements | Still below | **Should do** | XS |
| 9 | Label renames (Product Color, Unit (UOM)) | Old labels | **Should do** | XS |
| 10 | `formatInspectionDate` for display | Already has `formatDateDMY` | **Mostly done** | XS |

Plus three bugs I found in checker_app while surveying — see [Separate findings](#separate-findings).

---

## 1. Geofence: warehouse or factory — no work needed

The rule change is entirely in `backend/utils/locationUtils.js`. The checker may now
stand at **either** the legal/factory site **or** the warehouse; the nearest of the two
decides pass/fail.

checker_app needs no change. It already surfaces the server's text verbatim
([inspection.tsx:422](checker_app/src/app/vendors/[id]/inspection.tsx#L422) reads
`err?.data?.message`), so the new wording — *"the nearest of the vendor's registered
locations (legal/factory or warehouse)"* — appears on its own.

---

## 2. Flat-error-shape fix — small, worth doing

**What web fixed.** The shared axios interceptor rejects with a *flat* object,
`{ message, status, data }` — there is no `.response`. `qcCheckerService` was reading
`error.response.data`, so `err.status` and `err.code` came out `undefined` and every
downstream `if (err.status === 403)` branch was dead.

**Mobile has the same interceptor shape** — [axios.ts:112](checker_app/src/lib/axios.ts#L112)
also does `Promise.reject({ message, status, data })`.

Most mobile methods already dodge it with `error?.response?.data || error?.data`.
But three do not:

| Method | Line |
|---|---|
| `forgotPassword` | [qcCheckerService.ts:557](checker_app/src/services/qcCheckerService.ts#L557) |
| `resetPassword` | [qcCheckerService.ts:574](checker_app/src/services/qcCheckerService.ts#L574) |
| `saveInspectionDraft` | [qcCheckerService.ts:605](checker_app/src/services/qcCheckerService.ts#L605) |

Those are my code from yesterday, and they carry the bug.

**Real impact is low** — the interceptor already puts a usable string in
`error.message`, so the toasts still read correctly. What is lost is `err.status` and
`err.code`, which nothing branches on *yet*. Fixing it now stops it biting the moment
item 3 or 4 needs the status.

**Change:** three lines, `error?.response?.data || error?.data || {}` and
`error?.status ?? error?.response?.status`.

---

## 3. Geofence block → warning card with retry — needs your call

**What web now does.** A 403 `Location mismatch` no longer produces a toast. It renders
a persistent amber card: *"You're Not at the Vendor Location"*, the measured gap
(`You are 1840m away · must be within 1000m`), and a **Check My Location Again** button
that replays the start attempt.

**What mobile does today — two different gaps:**

**a) Product inspection: the error is thrown away.**
[ProductInspectionForm.tsx:115](checker_app/src/components/Products/ProductInspectionForm.tsx#L115)

```ts
qcCheckerService.startProductInspection(productId).catch(() => {
  /* ignore — start is best-effort, submission is the source of truth */
});
```

Fire-and-forget with an empty catch. A geofence rejection is invisible — the checker
fills the entire 7-step form and only discovers the block at submit.

**b) Vendor inspection: alert on submit, not on start.**
[inspection.tsx:420](checker_app/src/app/vendors/[id]/inspection.tsx#L420) shows a
`📍 Location Mismatch` alert, but only from `completeInspection`. There is no card and
no retry.

**Question for you:** mobile deliberately runs with the geofence relaxed — the form
auto-starts with no GPS gate, and the comments say so in both files. Porting web's
blocking card would reverse that decision.

Three options:

- **3a — surface only.** Keep auto-start; on a location error show a dismissible
  banner with the distance. Checker can still work. *(smallest, no behaviour reversal)*
- **3b — block on start, like web.** Card + retry, form unusable until on-site.
  *(true parity, reverses the mobile relaxation)*
- **3c — vendor flow only.** Leave the product flow alone.

I have no basis to pick for you — it is a policy decision, not a code one.

---

## 4. Product inspection draft / resume — needs your call, biggest item

**What web now does.** `pausedAt` + `totalPausedMs` in form state; "Yes, exit" became
**Save draft & exit** / **Exit without saving**; a paused resume re-asks the inspection
type; choosing a *different* type prompts to discard the draft; `makeDefaultFormData()`
was extracted so discard can rebuild a blank form.

**Mobile has none of the prerequisites.**
[ProductInspectionForm.tsx](checker_app/src/components/Products/ProductInspectionForm.tsx)
has **no draft persistence at all** — no AsyncStorage write, no `inspectionStartedAt`,
no `pausedAt`, no `totalPausedMs`, and `inspectionType` resets to `null` on every open
(line 68). Exit simply discards everything.

So this is not a port, it is building the feature that web already had *before* this
change, and then adding the change on top. Roughly:

1. AsyncStorage draft key + debounced save + restore on mount
2. Photo-stripping fallback when the snapshot is too large
3. Persist the chosen inspection type
4. `pausedAt` / `totalPausedMs` timing
5. Save-draft-and-exit dialog
6. Resume prompt + discard-draft confirmation

The vendor flow already has 1–5 ([inspection.tsx](checker_app/src/app/vendors/[id]/inspection.tsx),
from yesterday's commit), so there is a working pattern to copy — but it is still the
largest item here by some distance.

**My suggestion:** do items 6–9 first (small, self-contained, no behaviour questions),
then take this one on its own.

---

## 5. Duration in reports — needs item 4 first

Web now prints **Active / Paused / Total Duration** in the product PDF and shows an
"Exceeded schedule" badge on the checker report and the admin detail page, via
`frontend/src/lib/inspectionDuration.ts`.

Mobile has no `inspectionDuration.ts`. [reportPdf.ts:781](checker_app/src/lib/reportPdf.ts#L781)
prints Start Time and Complete Time only.

The helper is ~80 lines and ports as-is. **But it computes from `pausedAt` /
`totalPausedMs`, which item 4 creates** — without item 4 there is nothing to measure,
so this only makes sense afterwards.

One caveat worth knowing: web prints a `⚠` character through jsPDF's built-in Helvetica,
which is WinAnsi-encoded and has no such glyph. Mobile renders reports as HTML, so it
would not inherit that problem.

---

## 6. "N fields need to be completed" — should do

Web replaced *"Please complete this step"* with a count of the fields still missing,
by counting `[data-invalid="true"]` nodes in the DOM.

Mobile shows the first error only —
[ProductInspectionForm.tsx:283](checker_app/src/components/Products/ProductInspectionForm.tsx#L283).

Mobile is actually **easier** than web here: there is no DOM to count, but
`validateStep()` already returns a keyed error object, so the count is
`Object.keys(errs).length` — no registry walk needed. Web only counted DOM nodes
because its steps collapse several missing fields into one error string.

**Change:** add `countErrors` / `countAllErrors` to
[validation.ts](checker_app/src/components/Products/validation.ts), swap two toast calls.
The existing `InvalidAnchor` scroll-and-flash keeps working untouched.

---

## 7. Carton / Bale toggle — should do

Web added a `packagingType` field to the Measurement Inspection and Functional Tests
groups. Toggling relabels that group's tests — *"Carton Drop Test"* ⇄ *"Bale Drop Test"* —
via a whole-word regex; custom "Other" rows keep whatever the checker typed.

Mobile's [PI_data.ts](checker_app/src/components/Products/PI_data.ts) has the same test
IDs (`miCartonDimensions`, `miCartonGrossWeight`, `ftCartonDropTest`) and no toggle.

**Change:** port `PACKAGING_TOGGLE_GROUPS` + `relabelForPackaging` into `PI_data.ts`,
add a two-button segmented control to the group header in
[PI_Step5_Testing.tsx](checker_app/src/components/Products/Steps/PI_Step5_Testing.tsx).
Straight port, no platform difference.

---

## 8. Variants above Measurements — should do

Web moved the Product Variants block ahead of Measurements & Specifications.
Mobile still renders it at position 4, after measurements —
[PI_Step2_ProductVerification.tsx:430](checker_app/src/components/Products/Steps/PI_Step2_ProductVerification.tsx#L430).

Pure block move, no logic change.

---

## 9. Label renames — should do

| Field | Old | New | Mobile line |
|---|---|---|---|
| `pv_baseColor` | Base Color | **Product Color** | [320](checker_app/src/components/Products/Steps/PI_Step2_ProductVerification.tsx#L320) |
| `pv_uom` | Selling Unit (UOM) | **Unit (UOM)** | [327](checker_app/src/components/Products/Steps/PI_Step2_ProductVerification.tsx#L327) |

Web also swapped Category above Product Name in the same grid.

Field *keys* are unchanged, so saved drafts and submitted reports are unaffected.

---

## 10. Date formatting — mostly already done

Web added `formatInspectionDate()` to turn `2026-07-20` into `20 Jul 2026`.

Mobile already has `formatDateDMY` and already uses it in
[PI_Step6_Review.tsx:173](checker_app/src/components/Products/Steps/PI_Step6_Review.tsx#L173)
and [PI_Step1_GeneralInfo.tsx:116](checker_app/src/components/Products/Steps/PI_Step1_GeneralInfo.tsx#L116).

One gap: [VI_Step8_FinalReview.tsx:363](checker_app/src/components/Vendor/Steps/VI_Step8_FinalReview.tsx#L363)
prints `meta.inspectionDate` raw. Web now formats it. One-line fix.

---

## Separate findings

Not from the frontend pull — things I noticed in checker_app while surveying. Listed
so you can decide separately; I have not touched them.

### F1. UTC date bug, at the source

[ProductInspectionForm.tsx:124](checker_app/src/components/Products/ProductInspectionForm.tsx#L124)

```ts
serviceStartDate: new Date().toISOString().split('T')[0],
```

`toISOString()` is UTC. Between **00:00 and 05:30 IST this stamps yesterday's date** on
the inspection. Web hit this, documented it as bug F-09, and fixed it with
`toLocaleDateString('en-CA')`.

This is worse on mobile than the equivalent web slip: on web the bad call sits in a
fallback that only fires when the date is empty. Here it is the **primary value** — every
product inspection opened before 05:30 IST carries the wrong date into the report.

Same bug again at [PI_Step6_Review.tsx:336](checker_app/src/components/Products/Steps/PI_Step6_Review.tsx#L336).

Two-line fix. I would do this one regardless of the rest.

### F2. Start errors silently swallowed

Covered under item 3a — the empty `.catch(() => {})` at
[ProductInspectionForm.tsx:115](checker_app/src/components/Products/ProductInspectionForm.tsx#L115).
Worth a decision even if you skip the rest of item 3: right now *any* start failure —
geofence, expired window, unassigned checker — is invisible until submit.

### F3. `.status` / `.code` dropped

Same three service methods as item 2. Flagged there.

---

## What I'd suggest

**Round 1 (safe, no behaviour questions):** items 2, 6, 7, 8, 9, 10 + F1.
Roughly six files, all additive, nothing that changes how the flow behaves.

**Round 2 (needs your decision):** item 3 — pick 3a / 3b / 3c.

**Round 3 (own session):** items 4 and 5 together, since 5 depends on 4.

Tell me which rounds — or which individual numbers — and I'll start.
