# Notification Module — Web ↔ Mobile Parity Contract

> QC Checker notifications. Web: `frontend/src/components/Shared/NotificationDropdown.tsx` + `NotificationModal.tsx`. Mobile: `checker_app/src/components/General/{Header,NotificationsModal,NotificationBanner}.tsx` + `notificationService.ts` + `app/_layout.tsx`.
> Legend: ✅ ok / platform-appropriate · 🔧 fix · ➕ add · keep

---

## Platform-appropriate differences — KEEP (don't force)
- Mobile bell opens the **full modal directly**; web has a dropdown preview + secondary modal. (Mobile pattern is right for touch.)
- Mobile **NotificationBanner** (animated top card) vs web inline toast. Keep.
- Mobile **pull-to-refresh** + single page (limit 50) vs web infinite scroll (30/page). Keep.
- Mobile **FCM background/cold-start tap routing** (`handleNotificationNav` on data.screen). Keep — no web equivalent needed.
- Category tabs live in the mobile primary modal. Keep.
- `timeAgo`, 99+ badge cap, optimistic mark-read/unread/all, endpoints — ✅ already identical.

---

## FIXES (true parity gaps)

### 1. 🔧 Type → icon → color map (biggest gap)
Mobile `TYPE_ICON` maps only **6 types**; every other type shows a generic gray Bell. Web maps ~33 with distinct icon+color. Expand mobile to cover all QC-relevant types with web's EXACT icon choices + semantic colors. (Web uses `brand`-red for the two ASSIGNED types; mobile has no brand token → map brand → app blue `#2563eb`/`#dbeafe`. Everything else matches web's colors exactly.)

Target map (type → lucide icon → color / bg):
- VENDOR_ASSIGNED → Factory → blue `#2563eb` / `#dbeafe` (web brand→blue)
- PRODUCT_ASSIGNED → Package → blue `#2563eb` / `#dbeafe`
- QC_ASSIGNED → Star → blue `#2563eb` / `#dbeafe`
- INSPECTION_SCHEDULED → Calendar → blue `#2563eb` / `#dbeafe`
- REINSPECTION_RAISED → AlertCircle → orange `#ea580c` / `#ffedd5`
- REINSPECTION_REQUIRED → AlertCircle → orange `#ea580c` / `#ffedd5`
- INSPECTION_SUBMITTED → Check → teal `#0d9488` / `#ccfbf1`
- INSPECTION_COMPLETED → Check → green `#16a34a` / `#dcfce7`
- REINSPECTION_COMPLETED → Check → green `#16a34a` / `#dcfce7`
- REINSPECTION_RESULT → Check → orange `#ea580c` / `#ffedd5`
- INSPECTION_FINAL_REJECTED → AlertCircle → red `#dc2626` / `#fee2e2`
- VENDOR_STATUS_CHANGED → Check → gray `#4b5563` / `#f3f4f6`
- PRODUCT_APPROVED → Check → green `#16a34a` / `#dcfce7`
- PRODUCT_PENDING_APPROVAL → Package → yellow `#ca8a04` / `#fef9c3`
- PRODUCT_REJECTED → AlertCircle → red `#dc2626` / `#fee2e2`
- REINSPECTION_REQUIRED → AlertCircle → orange (above)
- SUPPORT_REPLY → Bell → indigo `#4f46e5` / `#e0e7ff`
- NEW_SUPPORT_TICKET → Bell → indigo `#4f46e5` / `#e0e7ff`
- NEW_ENQUIRY → Star → blue `#2563eb` / `#dbeafe`
- LOW_STOCK_ALERT → AlertCircle → yellow `#ca8a04` / `#fef9c3`
- OUT_OF_STOCK → AlertCircle → red `#dc2626` / `#fee2e2`
- PAYMENT_OVERDUE → AlertCircle → red `#dc2626` / `#fee2e2`
- default (unknown) → Bell → slate `#475569` / `#e2e8f0`

### 2. 🔧 Unread poll interval: mobile 15000ms → **30000ms** (web `POLL_INTERVAL`).

### 3. 🔧 Support category types: mobile uses `type.includes('SUPPORT')` (misses NEW_ENQUIRY). Change to web's explicit list `['SUPPORT_REPLY','NEW_SUPPORT_TICKET','NEW_ENQUIRY']`.

### 4. ➕ Add web-modal filters to the mobile modal (web `NotificationModal` has them; mobile lacks):
- **Read-filter pills**: All / Unread / Read (client-side over fetched list).
- **Search box**: filters title+message client-side, placeholder "Search notifications...", clear X.
- Empty-state copy adapts: search → "No notifications match your search"; read filter → "No {unread|read} notifications".

### 5. ➕ Foreground banner type icon: web toast shows a type-specific icon; mobile banner always shows Bell. Pass `type` from the foreground message through `_layout` → `NotificationBanner`, and render the type's icon/color from the shared map (fallback Bell). (`setupForegroundMessageListener` already receives `data` — forward `data.type`.)

---

## Summary
- Expand type→icon→color map to all web types (main fix).
- Poll 15s → 30s.
- Support category → explicit type list.
- Add read-filter pills + search to the mobile modal.
- Foreground banner shows type icon.
- Keep mobile-appropriate: banner, pull-to-refresh, FCM tap routing, full-modal-on-bell.
