# Dashboard & Profile — Web ↔ Mobile Parity Contract

> QC Checker Dashboard + Profile. Web: `frontend/src/components/Checker/CheckerDashboard/*`, `CheckerSettings/CheckerSettings.tsx`. Mobile: `checker_app/src/app/(tabs)/index.tsx` + `components/Dashboard/*`, `components/General/ViewProfile.tsx`.
> Legend: ✅ matches · 🔧 fix · ➕ add · ❌ remove · ⚠️ decision

---

## A. DASHBOARD — mostly ✅ (mobile already mirrors web)

Header/clock ✅, Vendor/Product toggle ✅, 4 StatCards ×2 domains (titles, icons, colors, computations, nav targets) ✅, Recent Assignments (product/vendor cards, badges, status maps) ✅, status derivation maps ✅.

Fixes:
| # | item | web | mobile | action |
|---|---|---|---|---|
| 1 | getInspections params | `{limit:50, status:'COMPLETED'}` | `{limit:50}` (no status) | 🔧 add `status:'COMPLETED'` (vendor Completed/Rejected counts derive from completed inspections) |
| 2 | Dead mock files | none | `RecentInspections.tsx` + `ScheduledInspections.tsx` (hard-coded fake data, unimported) | ❌ delete both dead files |
| 3 | Empty-state subtext | "No active assignments found." | + "New assignments will appear here" | 🔧 optional: drop the extra subtext to match web (minor — can keep) |
| 4 | Loading skeleton count | 8 assignment skeletons | 3 | cosmetic — leave |

---

## B. PROFILE — rebuild mobile to web's 6 read-only sections

Web `CheckerSettings` is **read-only**, 6 SectionCards (each: brand-tinted header, icon, read-only Field rows, empty→"—"):
1. **Profile Information** (icon User): avatar(profilePhoto/User), **Checker ID**(checkerId), **Full Name**(formatCheckerName||name), **Status** badge — ACTIVE emerald / SUSPENDED red / else slate.
2. **Contact Information** (Mail): **Primary Email**(email), **Primary Phone**(phone), **Secondary Email**(alternateEmail), **Secondary Phone**(alternatePhone).
3. **Personal Information** (Phone): **Date of Birth**(dateOfBirth), **Joining Date**(joiningDate).
4. **Address Information** (MapPin): **Address Line 1**(address), **City**(city), **State / Province**(state), **PIN / ZIP Code**(zipCode), **Country**(country).
5. **Professional Information** (Shield): **Specialization**(specialization), **Years of Experience**(experience), **Certifications**(certifications).
6. **Documents** (FileText): **ID Proof** view button (openDoc / WebBrowser for PDF) or "No ID proof uploaded".
Header: "Profile" / "View your personal details and account information". Loading spinner (Loader2). Dates via en-IN.

Mobile `ViewProfile` current (different structure): Identity card + **Stats row** + Contact + Professional(Department) + **Security & ID (Last Login)** + Personal + Certifications + **Edit Profile modal**.

Actions to reach ditto:
- 🔧 **Restructure to web's exact 6 sections/labels/fields** (read-only Field rows), including the Status badge map, Secondary Email/Phone, structured Address fields, Joining Date.
- ❌ Remove mobile-only EXTRAS: **Stats row** (Inspections/Experience/Years here), **Last Login** row, hard-coded **role**/**department** rows, tenure computation.
- ⚠️ **Edit Profile** modal + `PUT /qc-checkers/me` — web is read-only. DECISION: remove (strict ditto) vs keep (mobile self-service). → ask user.
- ➕ Section-header **blue icons** per the app icon convention.
- Keep the ID-Proof viewer (image lightbox / PDF browser) — it's the mobile equivalent of web's openDoc.

Header bits (bell + profile dropdown + sign-out) — ✅ fine. (Web sign-out unregisters push + clearCheckerAuth; mobile sign-out unregisters push + removes checkerID only — minor, leave.)

---

## Summary
- Dashboard: add `status:'COMPLETED'`, delete 2 dead mock files.
- Profile: rebuild to web's 6 read-only sections (exact labels/fields), remove Stats/Last Login/hardcoded role-dept, section icons; Edit modal = DECISION.
