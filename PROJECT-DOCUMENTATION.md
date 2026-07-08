# M2C MarkDowns — Codebase Documentation

> Auto-generated documentation based on full codebase analysis.
> Generated on: 2026-07-08

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack & Dependencies](#2-tech-stack--dependencies)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [Getting Started](#5-getting-started)
6. [Environment Variables](#6-environment-variables)
7. [Database Schema & Models](#7-database-schema--models)
8. [API Reference](#8-api-reference)
9. [Features & Modules](#9-features--modules)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Core Business Logic Flows](#11-core-business-logic-flows)
12. [Patterns & Conventions](#12-patterns--conventions)
13. [Third-Party Integrations](#13-third-party-integrations)
14. [Testing](#14-testing)
15. [Deployment & CI/CD](#15-deployment--cicd)
16. [Known Tech Debt & Observations](#16-known-tech-debt--observations)

---

## 1. Overview

**M2C MarkDowns** (Manufacturer-to-Customer) is a multi-vendor textile/garment marketplace platform built for the Indian market with international (USD) support. It connects manufacturers/vendors with end customers through a hub-based logistics model: vendors ship to a central admin hub, goods are quality-checked, then shipped to customers.

What makes this platform distinctive:

- **Vendor onboarding with physical verification**: vendors complete an 8-step registration, then a QC field officer physically visits their factory (GPS-geofenced, selfie-gated) and files a multi-step inspection report before the vendor is approved.
- **Product-level QC**: each product is also physically inspected (AQL sampling, defect counts, drop tests, etc.) before it can be sold.
- **Multi-vendor order orchestration**: one customer order fans out into per-vendor shipments, each with its own status lifecycle; the order's overall status is computed from the least-progressed shipment.
- **Automated vendor settlements**: settlement records are created per vendor per order (at the vendor's base price, not the customer's price — the margin is the platform's), with a daily cron flagging overdue payouts.

The monorepo contains **four applications**:

| App | Directory | Purpose |
|---|---|---|
| Backend API | `backend/` | Express.js + Prisma (MongoDB) REST API serving all clients; deployed on Vercel serverless |
| Web frontend | `frontend/` | Next.js 16 app with four portals: customer storefront, admin panel, vendor portal, QC checker portal |
| Customer mobile app | `mobile/` | Expo React Native e-commerce app (browse, cart, checkout, orders) |
| QC checker mobile app | `checker_app/` | Expo React Native field app for factory/product inspections with GPS geofencing |

There is no top-level README; `frontend/README.md` and `checker_app/README.md` are framework boilerplate. `DESIGN.md` at the root is a real, detailed design-system spec (colors, typography, component state matrix) wired into `frontend/src/app/globals.css`.

Repository history: 544 commits starting 2025-12-20 (active development, single main branch, no CI).

---

## 2. Tech Stack & Dependencies

### Backend (`backend/`) — Node.js 24.x, CommonJS

| Group | Packages |
|---|---|
| Core framework | `express@4`, `helmet`, `cors`, `morgan`, `express-session` |
| Database/ORM | `prisma@5` + `@prisma/client@5` (MongoDB provider) |
| Auth | `jsonwebtoken`, `bcrypt` **and** `bcryptjs` (both present — debt), `passport` + `passport-google-oauth20` |
| Payments | `razorpay` |
| Media | `cloudinary`, `multer` (in-memory), `adm-zip` |
| Notifications | `firebase-admin` (FCM push), `nodemailer` (SMTP email) |
| Scheduling | `node-cron` (overdue-settlement job) |
| Utilities | `libphonenumber-js`, `country-state-city`, `uuid`, `dotenv` |
| Dev | `nodemon`, `axios`, `typescript`/`ts-node` (types only; runtime is plain JS) |

### Web frontend (`frontend/`) — Next.js 16, React 19, TypeScript 5

| Group | Packages |
|---|---|
| Framework | `next@16.1.4` (App Router, Turbopack dev), `react@19.2.3` |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`), `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge` |
| UI | `lucide-react`, `@tabler/icons-react`, `@radix-ui/react-toast`, `@radix-ui/react-slot`, `swiper`, `recharts`, `react-select`, `@dnd-kit/*` (sortable admin lists), `react-easy-crop`, `react-signature-canvas` |
| HTTP | `axios` (shared instance with role-aware interceptors) |
| PDF/Export | `jspdf`, `jspdf-autotable`, `html2canvas`, `html2canvas-pro`, `pdfjs-dist`, `xlsx` |
| Push | `firebase` (web FCM with VAPID key) |
| Forms/geo | `country-state-city`, `react-select-country-list`, `libphonenumber-js` |

### Customer mobile app (`mobile/`) — Expo SDK 54, React Native 0.81.5, React 19.1

Expo Router 6, NativeWind 4 (Tailwind), `axios`, `@react-native-async-storage/async-storage`, `@react-native-firebase/app`+`messaging` (FCM), `@react-native-google-signin/google-signin`, `react-native-razorpay`, `react-native-webview` (PayU), `expo-image-picker`, `expo-video`, `lucide-react-native`, `react-native-reanimated`. New Architecture + React Compiler experiments enabled, typed routes on.

### QC checker mobile app (`checker_app/`) — Expo SDK 54, React Native 0.81.5

Same base stack as `mobile/`, plus: `expo-location` (geofence verification), `expo-print` + `expo-sharing` (PDF inspection reports), `expo-image-picker` (evidence photos/selfies), `@react-native-firebase/messaging` (push). No Razorpay/Google-Sign-In (checkers log in with Checker ID + password).

---

## 3. Project Structure

```
m2c/
├── DESIGN.md                     # Design system spec (colors, type scale, component states) — source of truth for frontend theming
├── backend/
│   ├── server.js                 # Express bootstrap: middleware chain, 40+ route mounts, cron startup
│   ├── api/index.js              # Vercel serverless entry (wraps server.js app)
│   ├── vercel.json               # Routes all traffic to api/index.js (@vercel/node)
│   ├── config/                   # cloudinary.js, firebase.js, passport.js, database.js, connectSMTP.js
│   ├── middleware/               # auth.js (JWT multi-role), upload.js (multer in-memory)
│   ├── routes/                   # ~37 route files (one per domain) + routes/auth/
│   ├── controllers/              # ~40 controllers (one per domain) + controllers/auth/
│   ├── prisma/
│   │   ├── schema.prisma         # 1,887 lines — all models (see §7)
│   │   ├── migrations/           # Prisma migrations
│   │   └── seed*.js, fix*.js     # Seed & one-off repair scripts
│   ├── jobs/overdueSettlements.js# Daily 9AM cron: flag overdue vendor payouts
│   ├── utils/                    # skuGenerator, vendorCodeGenerator, invoiceGenerator,
│   │                             # computeOrderStatus, notificationService, emailService, etc.
│   └── scripts/                  # backfills & data migrations (SKUs, vendor codes, Cloudinary)
├── frontend/
│   ├── next.config.ts            # Custom Cloudinary image loader, remote patterns, package tree-shaking
│   └── src/
│       ├── app/                  # App Router: storefront + /admin + /vendor + /checker + /auth
│       │   └── api/check-url/    # Only Next API route (server-side URL reachability check)
│       ├── components/           # AdminDashboard/, VendorDashboard/, Checker/, WebSite/, VendorHub/, UI/
│       ├── services/             # 40+ API service modules (one per backend domain)
│       ├── lib/                  # axios.ts, auth.ts, vendorAuth.ts, firebase.ts, PDF generators
│       ├── hooks/                # useUserAuth, useVendorAuth, useDebounce, useSEO, usePageTracking…
│       └── types/, constants/, data/, styles/, utils/
├── mobile/                       # Customer app (Expo Router)
│   └── src/
│       ├── app/                  # index (splash), (auth)/Login, (tabs)/ 6 tabs, (any)/ public screens
│       ├── services/             # 19 API service modules
│       ├── context/              # CartContext, WishlistContext (guest→auth migration)
│       ├── lib/                  # axios.ts, currency.ts, stockSync.ts, toast-utils.ts
│       └── components/           # WebSite/ (feature components), General/, ui/
└── checker_app/                  # QC field app (Expo Router)
    └── src/
        ├── app/                  # index (splash), (auth)/Login, (tabs)/ 4 tabs,
        │                         # vendors/[id]/inspection, product-inspection, *-report/[id]
        ├── services/             # qcCheckerService.ts, notificationService.ts
        ├── components/           # Dashboard/, Products/ (8-step form), Report/, General/
        └── utils/                # imagePicker.ts
```

File counts (JS/TS source): backend 135, frontend 497, mobile 107, checker_app 49.

---

## 4. Architecture

### Overall pattern

**Modular monolith API + multiple thin clients.** The backend is a single Express app organized by domain (route file → controller file per domain), with Prisma as the data layer over MongoDB. All four clients (web storefront, admin, vendor, checker portals in Next.js; two Expo apps) speak to the same REST API with role-scoped JWTs. There is no service/repository layer separation — controllers call Prisma directly.

### Backend bootstrap (`backend/server.js`)

Middleware chain in order:
1. **CORS** — custom origin whitelist (localhost dev ports, Vercel deploy domains, `m2cmarkdowns.com`)
2. **Helmet** — security headers
3. **Morgan** — request logging
4. **Body parsers** — JSON/urlencoded with **50 MB limit** (large base64 image payloads from inspection forms), raw-body capture for the Razorpay webhook
5. **express-session** (24 h TTL, `JWT_SECRET` as session secret) + **Passport** (Google OAuth only)
6. ~40 route mounts under `/api/*` (see §8)

Initialization sequence: `connectDB()` → `initializeAdmin()` (auto-creates the default admin from `ADMIN_EMAIL`/`ADMIN_PASSWORD` if missing) → session cleanup (local dev only) → start `node-cron` job (daily 9:00 AM overdue-settlement check). An `isInitialized` flag makes this cold-start-safe on Vercel; the app only calls `listen()` when not on Vercel.

Special endpoints: `GET /` (server info), `GET /health` (liveness), `GET /api/document-proxy` (server-side Cloudinary fetcher to bypass browser CORS; restricted to Cloudinary URLs).

### Request lifecycle

```
Client → CORS/Helmet/Morgan → body parser → route (/api/<domain>) 
       → authenticateToken (middleware/auth.js: decode JWT, load Vendor/QCChecker/User/Admin, attach req.user)
       → requireRole / requirePermission guard (optional)
       → controller function (validation + Prisma queries/transaction)
       → JSON response  |  fire-and-forget side effects (notifications, audit logs) after response path
```

### Frontend architecture (Next.js App Router)

Four portals share one Next app, separated by URL prefix: `/` (storefront), `/admin`, `/vendor`, `/checker`. There is **no `middleware.ts`** — route protection is component-level (each portal layout/page checks its token in localStorage) plus a global axios 401 interceptor that clears tokens and redirects to the right login page per role. State management is deliberately light: React hooks + localStorage + two custom event buses (`lib/authEvents.ts` subscription and a `cart-changed` DOM CustomEvent) instead of Redux/Zustand.

### Mobile apps architecture

Both Expo apps use file-based routing (Expo Router) with a splash → auth-check → tabs pattern, AsyncStorage for token persistence, a shared-style `lib/axios.ts` with token-priority interceptors, and lazy-loaded native modules (Firebase, Google Sign-In, expo-print) wrapped in try/catch so the apps still run in Expo Go.

### How the apps relate

```
                    ┌────────────────────────────┐
                    │   backend (Express+Prisma)  │
                    │   MongoDB · Cloudinary ·    │
                    │   Razorpay · FCM · SMTP     │
                    └──────┬──────┬──────┬────────┘
              JWT: userToken│vendorToken│checkerToken/adminToken
       ┌────────────┬───────┴──┐   ┌────┴──────────┐
  frontend (web)  mobile app  frontend /vendor   checker_app +
  storefront +    (customers) + /admin portals   frontend /checker
  customer pages                                 (QC officers)
```

---

## 5. Getting Started

There is no root-level setup script; each app is installed and run independently.

### Backend

```bash
cd backend
npm install                 # runs postinstall → prisma generate
# create backend/.env with the variables in §6
npm run prisma:generate     # regenerate Prisma client if schema changed
npm run dev                 # nodemon server.js → http://localhost:5000
npm start                   # production: node server.js
npm run prisma:studio       # browse MongoDB via Prisma Studio
npm run dev:webhook         # ngrok tunnel for Razorpay webhooks (fixed subdomain)
```

Seed/maintenance scripts live in `backend/prisma/` (`seedRoles.js`, `seedTestData.js`, `seedQAVendor.js`) and `backend/scripts/` (`backfillProductSkus.js`, `backfillVendorCodes.js`, `createGstIndex.js` — **must be run manually** to create the sparse unique index on `Vendor.gstNumber`, `migrateBase64ToCloudinary.js`, `migrateToVendorShipments.js`).

### Web frontend

```bash
cd frontend
npm install
# create frontend/.env.local with NEXT_PUBLIC_* vars from §6
npm run dev     # next dev --turbopack (4 GB heap) → http://localhost:3000
npm run build && npm start
```

### Mobile apps (both `mobile/` and `checker_app/`)

```bash
cd mobile   # or checker_app
npm install
# .env: EXPO_PUBLIC_API_URL (+ EXPO_PUBLIC_GOOGLE_CLIENT_ID for mobile/)
npx expo start            # requires a dev-client build for Firebase/Google/Razorpay/print
eas build --profile development   # profiles: development, preview, production, production-apk
```

Note: Google Sign-In, FCM push, Razorpay, and expo-print are native modules — they no-op or degrade gracefully in Expo Go; use an EAS development build for full functionality.

---

## 6. Environment Variables

No `.env.example` files exist anywhere in the repo (flagged in §16). Variables discovered from code:

### Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | MongoDB connection string (Prisma datasource) |
| `JWT_SECRET` | Yes | Signs all JWTs; also the express-session secret |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Yes | Bootstrap default admin on startup; `ADMIN_EMAIL` also routes Google OAuth logins to the Admin table |
| `FRONTEND_URL`, `BACKEND_URL` | Yes | OAuth redirects, email links, CORS |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Yes | Media storage |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth (passport) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`, `SMTP_SECURE` | Yes | Transactional email (nodemailer) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | For payments | Razorpay gateway (also configurable per-DB via PaymentSettings model) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional | FCM push (JSON string of service account) |
| `NODE_ENV`, `PORT` | Optional | Defaults: development, 5000 |

### Web frontend (`frontend/.env.local`)

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend base URL (default `http://localhost:5000/api`; `lib/axios.ts` normalizes trailing `/api`) |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay checkout public key |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `..._AUTH_DOMAIN`, `..._PROJECT_ID`, `..._STORAGE_BUCKET`, `..._MESSAGING_SENDER_ID`, `..._APP_ID`, `..._VAPID_KEY` | Web push (FCM project `m2c-markdowns-2a6ed`) |

### Mobile apps (`.env`)

| Variable | App | Purpose |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | both | Backend base URL (checker falls back to `http://10.0.2.2:5000/api` for Android emulator) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | mobile | Google Sign-In web client ID |
| `EXPO_PUBLIC_SITE_REGION` | mobile | `IN` or `US` regional pricing (defaults to US if unset — see §16) |

---

## 7. Database Schema & Models

Prisma over **MongoDB** (`backend/prisma/schema.prisma`, ~1,887 lines). Summary of every model grouped by domain; all models have Mongo ObjectId `id` plus `createdAt`/`updatedAt` unless noted.

### Identity & access

- **Admin** — staff accounts. `email` (unique), `password?`, `googleId?`, `provider` (local/google), `roleId → Role`, `permissions[]`, `isVerified`, `isActive`, `fcmTokens[]`, `onboardingCompleted`, `workingHours[]`.
- **User** — customers. `email` (unique), `password?`, `googleId?`, `isVerified`, `isActive`, `phoneNumber`, `address`, `addresses[]` (max 3 enforced client-side), relation `reviews[]`.
- **Role** — RBAC. `name` (unique), `permissions[]` (strings), `isSystem`. "Super Admin" bypasses all permission checks.
- **Session** — server-side token registry. `userId`, `token` (unique), `expiresAt` (7-day TTL). Auth middleware validates admin/user JWTs against this table.

### Vendor domain

- **Vendor** — the largest model; captures the entire 8-step registration. Key fields: `vendorCode` (unique, `VND-YYYY-NNNN`), `email`, `password?`, `status` enum (`PENDING → UNDER_REVIEW → APPROVAL_PENDING → APPROVED | REJECTED | REINSPECTION | SUSPENDED`); owner profile (`ownerName`, `designation`, `ownerEmail/Phone/Photo/Address`, `businessStartDate`, `additionalOwners`); company details (`companyName`, `companyType` MANUFACTURER/TRADER/EXPORTER/…, `businessType`, `gstNumber` — unique via **manually created sparse index**, `panNumber`, `iecCode`, `aadhaarNumber`, `companyLogo`); facilities (`enabledFacilities` JSON, `facilityDetails` JSON, `factoryAddress`, `warehouseAddress`, `productionCapacity`); trade info (`vendorType` enum e.g. TEXTILE_MANUFACTURER, `productCategories[]`, `specializations[]`, `exportCountries[]`); `assignedQcId → QCChecker`; `rating`/`ratingCount` (from AdminReview); `applicationStep`, `completedSteps[]`.
- **VendorCertification** — `name`, `issuedBy?`, `certificateNumber?`, `expiryDate?`, `documentUrl`, `isCustom`.
- **VendorDocument** — `type` (DocumentType enum: GST cert, PAN, IEC…), `name`, `documentUrl` (Cloudinary).
- **VendorBankDetails** (1:1) — `bankName`, `accountNumber`, `ifscCode?`, `swiftCode?`, `iban?`, `isVerified`, `verifiedAt/By`.
- **VendorReference** — client references: `companyName`, `contactPerson`, `email`, `phone`, `relationship`.

### Catalog & inventory

- **Product** — `vendorId`, `name`, `slug` (unique), `description`, `category`, `subCategory`; pricing: `basePrice` (vendor price, settlement basis), `originalPrice?`, `discount?`, `gstPercentage?`, admin overrides `adminFixedPrice?`, `priceINR?`, `priceUSD?`; `priceVisibility` (IN_ONLY/COM_ONLY/BOTH); SKU: `baseSku` (immutable `CODE-YY-NNNNNN`), `variantSeq`; lifecycle: `status` (ACTIVE/INACTIVE/OUT_OF_STOCK) and `approvalStatus` (PENDING/QC_APPROVED/APPROVED/REJECTED/REINSPECTION); QC: `assignedQcId?`, `qcInspectionData?` (JSON form), `inspectionCycleNumber`, `previousInspectionData[]`; stock: `totalStock`, `inStock`, `trackInventory`; `weightUnit` (recently added), `dispatchTimeline` JSON, `logisticsConfig?` JSON; relations `images[]`, `variants[]`.
- **ProductVariant** — `variantName?`, `size?`, `color`, `colorHex?`, `sku` (unique, `BASESKU-A`, bijective base-26 suffix), `price`, `stock`, per-variant `adminFixedPrice?/priceINR?/priceUSD?`, `images[]`.
- **ProductImage** — `url`, `alt`, `isPrimary`, `imageType` (cover/gallery), `sortOrder`.
- **Inventory** — vendor raw stock pre-product: `name`, `sku` (unique), `category`, `currentStock`, `baseStock`, `lowStockAlert`, `status`, `sourceType` (SUPPLIER/MANUFACTURE), `hasProductCreated`, `productId?`.
- **StockChangeHistory** — audit: `inventoryId`, `previousStock`, `newStock`, `changeAmount`, `reason`, `changedBy`, `changedByType` (admin/vendor/system), `changedByName?`.
- **Category** — hierarchical: `name`, `slug` (unique), `parentId?` (self-ref), `metaTitle/Description?`, `image?`, `status`, `sortOrder`.
- **BagType** — order add-on packaging: `name`, `price`, `priceINR?/priceUSD?`, `image?`, `isActive`, `sortOrder`.

### Orders & fulfillment

- **Order** — `orderId` (unique, `ORD-YYYY-XXXXXX`), `invoiceNo` (from InvoiceSettings, e.g. `INV-2024-25-0001`); customer snapshot (`customerId/Name/Email/Phone`); money: `subtotal`, `shippingCost`, `tax`, `discount`, `totalAmount`, `currency` (INR/USD); bag add-on (`bagTypeId/Name/Price?`); payment: `paymentStatus` (PENDING/PAID/FAILED/REFUNDED), `paymentMethod`, `paymentId`; `status` (computed from shipments, persisted for querying); `shippingAddress` JSON; `assignedHubId?`; relations: `items[]`, `shipments[]`, `statusHistory[]`, `reviews[]`, `settlements[]`.
- **OrderItem** — product snapshot per line: `productName`, `productImage?`, `variantId?`, `size?`, `color?`, `sku`, `quantity`, `unitPrice`, `totalPrice`, `vendorId`, `vendorName`, `shipmentId?`.
- **VendorShipment** — per-vendor fulfillment unit: `shipmentId` (unique, `ORD-YYYY-XXXXXX-V1`), `orderId`, `vendorId/Name`, independent `status` (same enum as Order), `vendorCarrier?`, `vendorTrackingId?`, `vendorShippedAt?`, `assignedHubId?`, relations `items[]`, `adminReviews[]`, `statusHistory[]`.
- **AdminReview** — hub staff QA on an incoming shipment: `shipmentId?/orderId?/vendorId?` (denormalized), `reviewComments?`, `qualityCheckNotes?`, `rating?` (1–5, feeds Vendor.rating), `approved`, `reviewedBy?`, `rejectionReason?`, `returnToVendor?`.
- **OrderStatus enum**: `ORDER_CREATED, VENDOR_PROCESSING, PACKED_BY_VENDOR, IN_TRANSIT_TO_ADMIN_HUB, RECEIVED_AT_ADMIN_HUB, APPROVED_BY_ADMIN_HUB, REJECTED_BY_ADMIN_HUB, SHIPPED_TO_CUSTOMER, DELIVERED, CANCELLED, RETURNED`.
- **Hub** — fulfillment center: `name`, `address?`, `city`, `state`, `zipCode?`, `phone?`, `email?`, `isActive`.

### QC & inspections

- **QCChecker** — `checkerId` (unique, e.g. `QC-001`), `email` (unique), `password` (hashed), `name`, `phone`, address fields, `joiningDate`, `specialization?`, `experience?`, `status` (ACTIVE/INACTIVE/SUSPENDED), `isActive`, counters `assignedVendors`/`completedInspections`, relations `vendorsList[]`, `productsList[]`, `inspections[]`.
- **Inspection** — factory inspection: `vendorId`, `checkerId`, assignment (`poNumber`, `clientName`, `scheduledDate`, `scheduledTime`, `priority`), `status` (`SCHEDULED → IN_PROGRESS → SUBMITTED → UNDER_ADMIN_REVIEW → COMPLETED | REJECTED | REINSPECTION | CANCELLED`), `itemsToInspect` JSON, `result` (PASSED/FAILED), `score?`, timestamps (`startedAt/completedAt/submittedAt/reviewedAt/reviewedBy`), rejection fields, **location verification** (`checkerLatitude/Longitude`, `vendorLatitude/Longitude`, `locationVerified`, `locationDistanceM`), reinspection chain (`parentInspectionId?`, `cycleNumber`).
- **InspectionAuditLog** — `entityType` (FACTORY_INSPECTION/PRODUCT_INSPECTION), `entityId`, `action` (SUBMITTED/ADMIN_APPROVED/ADMIN_REJECTED/REINSPECTION_RAISED/REINSPECTION_COMPLETED), `performedById/Type`, `rejectionReason?`, `remarks?`, `attachments[]`, `inspectionData?` snapshot, `cycleNumber`, `parentLogId?`.

### Payments & finance

- **PaymentSettings** — gateway toggles + credentials: `razorpayEnabled`, `razorpayKeyId/KeySecret/WebhookSecret?`, `payuEnabled`, `payuMerchantKey/Salt?`.
- **Settlement** — vendor payout: `settlementNumber` (unique, `SET-YYYY-XXXXXX-###`), `vendorId/Name`, `orderId`, `billingNumber`, `period`, `amount` (vendor base-price total), `status` (Pending/Processing/Paid/Failed), `dueDate?`, `paymentDate?`, `transactionId?`.
- **InvoiceSettings** — invoice numbering: `invoicePrefix`, `sequenceLength`, `currentSequence`, financial-year config (`autoFinancialYear`, start month/day, default April 1 Indian FY), `formatTemplate` (`{PREFIX}-{FY}-{SEQ}`).
- **Coupon** — `code` (unique), `discountType` (PERCENTAGE/FIXED_AMOUNT), `discountValue`, `minPurchaseAmount?`, `maxDiscountAmount?`, `usageLimit?`, `usedCount`, `perUserLimit?`, `startDate`, `expiryDate`, `isActive`, `freeShipping` + `freeShippingOrderNumbers[]` (e.g. free shipping on a customer's 3rd/5th/10th order), popup marketing fields, `applicableCategories[]`.
- **ExchangeRate**, **GSTSetting** — platform financial settings.

### Content & support

- **CompanyInfo**, **SEOSettings**, **BannerImage** — CMS-ish settings.
- **Review** — customer product reviews (rating, comment, images, linked to order for verified purchase).
- **SupportTicket** + **TicketMessage** — help desk threads.
- **Notification**, **DeviceToken** — in-app notification feed + FCM device registry.
- **PageView**, **ProductView** — first-party analytics events.
- **Counter** — atomic sequence generator keyed by string id (e.g. `vendor-2026`, `sku-MNC-26`), backs all human-readable code generation.

---

## 8. API Reference

All endpoints are prefixed `/api`. Auth column: 🔓 public, 👤 customer JWT, 🏭 vendor JWT, 🛡 admin JWT (+permission), ✅ checker JWT. This is a domain-level map (the API has 40+ route files; per-route guards are in each `backend/routes/*.js`).

| Mount | Key endpoints | Auth | Controller |
|---|---|---|---|
| `/auth` | `POST /register`, `POST /login`, `GET /me`, `POST /logout`, `PUT /profile`, `POST /verify-email`, `POST /forgot-password`, `POST /reset-password`, `GET /google` + callback, address CRUD (`/addresses`) | 🔓/👤 | `controllers/auth/*` |
| `/vendors` | `POST /register` (8-step payload, base64 → Cloudinary), `POST /login`, `GET/PUT /profile`, admin: list, `view/:id`, approve/reject/suspend/confirm, assign QC | 🔓/🏭/🛡 | `vendorController.js` |
| `/products` | public browse (`GET /`, `GET /:slug`), vendor CRUD, admin CRUD + approval + pricing overrides + QC assignment, variant stock updates | 🔓/🏭/🛡 | `productController.js` |
| `/orders` | `POST /` (create — see §11), customer list/detail, vendor shipment views, admin list/detail, status updates, admin shipment reviews, invoice data | 👤/🏭/🛡 | `orderController.js`, `vendorOrderController.js`, `adminOrderController.js` |
| `/payments` | `POST /razorpay/create-order`, `POST /razorpay/verify` (HMAC-SHA256), `POST /webhook/razorpay`, `POST /payu/create-hash` | 👤 (webhook 🔓+signature) | `paymentController.js` |
| `/cart` | `GET /`, `POST /add`, `PUT /:itemId`, `DELETE /:itemId`, `POST /clear` | 👤 | `cartController.js` |
| `/wishlist` | CRUD + shareable public token view | 👤/🔓 | `wishlistController.js` |
| `/qc-checkers` | admin CRUD + resend credentials; checker: `POST /login`, `GET/PUT /me`, `GET /vendors`, `GET /products`, `GET /products/reports`, `/vendors/:id/details`, `/vendors/:id/active-inspection`, `POST /vendors/:id/approve|reject`, `POST /products/:id/start|approve|reject` (geofenced) | 🛡/✅ | `qcCheckerController.js` |
| `/inspections` | `GET /` (assigned), `POST /:id/start` (geofence), `POST /:id/complete`, `GET /:id/my-report`; admin assign/review | ✅/🛡 | `inspectionController.js` |
| `/reinspections` | admin review queue, approve / raise reinspection, `GET /:entityType/:entityId/audit-trail` | 🛡/✅ | `reinspectionController.js` |
| `/settlements` | list/detail, update status & due date | 🛡 (vendor views own) | `settlementController.js` |
| `/inventory` | vendor inventory CRUD, stock updates (writes StockChangeHistory) | 🏭/🛡 | `inventoryController.js` |
| `/categories` | public tree; admin CRUD | 🔓/🛡 | `categoryController.js` |
| `/coupons` | `POST /apply` (code + cartTotal + currency); admin CRUD | 👤/🛡 | `couponController.js` |
| `/hubs` | admin CRUD of fulfillment hubs | 🛡 | `hubController.js` |
| `/notifications` | `POST /register-token`, `DELETE /remove-token`, feed list + mark-read, unread count | any role | `notificationController.js` |
| `/reviews` | submit (verified purchase), list per product, admin moderation | 👤/🔓/🛡 | `reviewController.js`, `adminReviewController.js` |
| `/support` | ticket CRUD + threaded messages | 👤/🏭/🛡 | `supportController.js` |
| `/admin-dashboard`, `/vendor-dashboard` | KPI aggregates, earnings charts, recent orders, top products | 🛡/🏭 | `*DashboardController.js` |
| `/reports`, `/vendor-reports`, `/analytics` | report exports, page/product view tracking | 🛡/🏭/🔓 | `reportsController.js`, `analyticsController.js` |
| Settings mounts | `/company-info`, `/gst-settings`, `/exchange-rate`, `/seo-settings`, `/banners`, `/bag-types`, `/invoice-settings`, `/payment-settings`, `/free-shipping` | 🔓 read / 🛡 write | respective controllers |
| `/roles`, `/user-management`, `/admin-profile` | RBAC role CRUD, staff & customer management | 🛡 | `roleController.js`, `userManagementController.js` |
| `/enquiries`, `/contact-enquiries` | vendor business enquiries, website contact form | 🔓/🛡 | `enquiryController.js`, `contactEnquiryController.js` |

### Next.js API route (frontend)

- `GET /api/check-url?url=<...>` (`frontend/src/app/api/check-url/route.ts`) — server-side HEAD request (8 s timeout) used by vendor-registration Step 1 to verify the vendor's website is reachable without CORS issues. Non-5xx counts as reachable.

---

## 9. Features & Modules

### 9.1 Customer storefront (web `frontend/src/app/*` + `mobile/`)

Product browsing (home hero/featured/best-seller sections, category tree, search/filter), product detail with variants and reviews, cart, wishlist (with shareable public token URLs on web: `/wishlist/shared/[token]`), multi-step checkout (address → shipping → payment → review), order history & tracking, profile with address book (max 3 saved addresses), contact/vendor-enquiry forms, static pages (about/privacy/terms/returns). The mobile app mirrors this with 6 tabs (Home, Categories, Wishlist, Cart, Orders, Profile), guest cart/wishlist in AsyncStorage that **migrates to the server on login**, live stock re-sync every time the app returns to foreground (`CartContext.syncStock()` → `lib/stockSync.ts`), and regional INR/USD pricing via `lib/currency.ts` + the `/exchange-rate` endpoint.

### 9.2 Vendor portal (web `/vendor/*`)

- **Registration** (`/vendor/register`, `components/VendorHub/VendorPanel`): 8 steps — Company Details → Warehouse/Factory → Owner Profile (multiple owners supported; "Director" was renamed "Owner" across apps) → Vendor Type & Products (category selection + up to 5 sample products per category with photos) → Manufacturing Facilities (per-facility machine counts/capacity) → Certifications & Logistics → Contact & Trade Info → Review & Submit. Photos travel as base64; the backend deep-walks the payload (`resolveBase64InValue` in `config/cloudinary.js`) and replaces them with Cloudinary URLs.
- **Status page** (`/vendor/status`): tracks PENDING → UNDER_REVIEW (QC inspection) → APPROVAL_PENDING → APPROVED.
- **Dashboard**: products CRUD (creates go into admin approval + QC pipeline), inventory with stock-change audit, orders (their shipments only), earnings & payouts (settlement views), bank details, reviews, reports, support tickets.

### 9.3 Admin portal (web `/admin/dashboard/*`)

Dashboard KPIs/charts (recharts), analytics, staff management with RBAC roles & permissions, customer management, vendor lifecycle management (approve/reject/suspend, assign QC checkers, view factory inspections), product approval incl. vendor product requests and admin price overrides (`adminFixedPrice`, `priceINR`, `priceUSD`), inventory, three order views (customer orders, vendor→hub inbound, hub→customer outbound), QC checker CRUD, QC report review, reinspection review (factory & product), billing (billings/invoices/settlements), categories & bag types, CMS banners, coupons (incl. free-shipping-on-Nth-order and popup campaigns), review moderation, support, website enquiries, settings (GST, exchange rate, SEO, invoice numbering, payment gateways, company info).

### 9.4 QC inspection system (checker_app + web `/checker/*` + backend)

The heart of the platform's trust model:

- **Factory (vendor) inspection**: admin schedules an `Inspection` for an assigned checker (date/time/priority/PO). In the checker app, starting the inspection requires a **selfie + GPS capture**; the backend geofence-verifies the checker is within a threshold distance of the vendor's factory (`locationDistanceM` vs threshold). The 7-step mobile form covers factory details, legal registration, production info, infrastructure, quality & safety, result + remarks, and photo evidence; a second selfie gates submission. (The web checker portal has a 9-step variant of this form.)
- **Product inspection**: 8-step mobile form — General Info → Preparation → Measurements → Packaging (scored remarks) → Defects (AQL config, critical/major/minor counts with validation) → Testing (drop test, color fastness dry/wet, seam strength, smell check — pass/fail with evidence photos) → Documentation (signature, ID card) → Review & sign-off (approve/reject).
- **Admin review & reinspection**: submissions go `SUBMITTED → UNDER_ADMIN_REVIEW`; the admin approves (COMPLETED / product `approvalStatus=APPROVED`) or raises a reinspection, which creates a new cycle (`parentInspectionId`, incremented `cycleNumber`). Every decision is recorded in `InspectionAuditLog`, and both checker and admin UIs render the audit trail.
- **Reports**: the checker app renders inspection reports to PDF via expo-print and shares them; the web portal generates branded multi-page PDFs (`lib/reportPdfDownload.ts`, `factoryInspectionReportPdf.ts`, `productInspectionReportPdf.ts`) with a **canonical** signed variant (signature page + attestation) and an **internal** admin variant (watermark banner).

### 9.5 Orders, hub logistics & settlements (backend)

See §11 for the flow. One order → N `VendorShipment`s → hub QA (`AdminReview`, which also feeds vendor ratings) → customer delivery. `Settlement` records are created at order time per vendor; `jobs/overdueSettlements.js` (node-cron, daily 9:00 AM) notifies admins about overdue payouts.

### 9.6 Notifications

`utils/notificationService.js` writes in-app `Notification` rows and pushes via FCM (`firebase-admin`) to `DeviceToken`s. All three client types register tokens via `POST /notifications/register-token`. The checker app polls unread count every 15 s; the web frontend uses Firebase web messaging with a VAPID key; both mobile apps handle foreground banners, background/tap routing, and cold-start notification taps.

---

## 10. Authentication & Authorization

### Token model

Single `JWT_SECRET`, but **four distinct principal types** distinguished by token payload:

| Principal | Token payload marker | Storage key (web / mobile) | Extra validation |
|---|---|---|---|
| Customer | `userId`/`id` | `userToken` (local or sessionStorage per "Remember Me") | Session row must exist & be unexpired (7-day TTL) |
| Admin | `userId` + Admin lookup | `adminToken` | Session row; loads Role + `permissions[]` onto `req.user` |
| Vendor | `type: 'vendor'`, `vendorId` | `vendorToken` | Vendor exists, status ≠ SUSPENDED |
| QC checker | `type: 'qc_checker'`, `checkerId` | `checkerToken` | `isActive` && status ≠ SUSPENDED |

`middleware/auth.js` reads the token from `Authorization: Bearer` or the `token` httpOnly cookie, decodes it, branches on type, and attaches the loaded principal to `req.user` with `role` set to `USER`/`ADMIN`/`VENDOR`/`QC_CHECKER`. Guards: `requireRole([...])`, `requireVendorRole`, `requireAdminRole`, `requirePermission([...])` (Super Admin role name bypasses), `optionalAuth`.

### Flows

- **Registration/login (customer)**: `POST /auth/register` → email verification (SMTP link) → `POST /auth/login` → `{ token, user }`. Password reset via `forgot-password`/`reset-password` token emails.
- **Google OAuth**: passport strategy in `config/passport.js`. Email == `ADMIN_EMAIL` → Admin, else customer User. New Google users are auto-created verified. Security rule: a locally-registered but **unverified** account cannot log in via Google until email verification. Web callback lands on `/auth/google/success` (customer) or `/admin/dashboard?token=…&user=…` (admin), which parses and stores the token. Mobile uses native Google Sign-In and posts the profile to `/auth/google-callback`.
- **Vendor**: `POST /vendors/login` (email/password) — dashboard access additionally gated by `isVendorApproved()` on the frontend (`lib/vendorAuth.ts`).
- **Checker**: `POST /qc-checkers/login` with Checker ID + password; credentials are created (and re-sendable) by admins.
- **401 handling** (all clients): axios response interceptor clears the relevant tokens and (web) redirects to the role's login page — `/admin/login`, `/vendor`, `/checker`, or `/login`.

### Authorization

- **Admin RBAC**: `Role.permissions[]` strings checked by `requirePermission` (backend) and `hasPermission()` / `PermissionGuard` (frontend, `lib/auth.ts`).
- **Vendor/checker scoping**: controllers filter queries by `req.user.vendorId` / `checkerId` (e.g., vendors only see their own shipments; checkers only see assigned vendors/products).

There is **no refresh-token mechanism** on any client; sessions rely on the 7-day server-side Session TTL for user/admin and plain JWT expiry for vendor/checker.

---

## 11. Core Business Logic Flows

### Order creation (the core transaction — `orderController.createOrder`)

```
Customer (web/mobile checkout)
  -> POST /payments/razorpay/create-order  ────────────┐
  -> Razorpay checkout UI (key from settings/env)       │ payment leg
  -> POST /payments/razorpay/verify (HMAC-SHA256)  ─────┘
  -> POST /orders { shippingAddress, paymentMethod, razorpay ids+signature, bagType, coupon }
       ├─ parallel prefetch: cart, user, bag type, payment settings, invoice number
       ├─ re-verify Razorpay signature inline
       ├─ price resolution per item:
       │    customer price = priceUSD/priceINR → adminFixedPrice → basePrice
       │    vendor price   = basePrice (settlement basis)
       ├─ Prisma $transaction (30s timeout):
       │    create Order + OrderItems
       │    re-validate stock INSIDE tx (race-condition guard)
       │    increment coupon.usedCount
       │    decrement variant stock → inventory baseStock → recompute totalStock
       │    create one VendorShipment per vendor  (ORD-…-V1, V2, …)
       │    create one Settlement per vendor      (SET-…)
       │    clear cart
       └─ post-tx fire-and-forget: StockChangeHistory batch, vendor push+in-app
          notifications, admin low-stock alerts, customer confirmation
  <- 201 Order
```

### Multi-vendor fulfillment & status computation

```
VendorShipment lifecycle (each vendor independently):
ORDER_CREATED → VENDOR_PROCESSING → PACKED_BY_VENDOR → IN_TRANSIT_TO_ADMIN_HUB
  → RECEIVED_AT_ADMIN_HUB → (AdminReview: approve/reject, rating feeds Vendor.rating)
  → APPROVED_BY_ADMIN_HUB → SHIPPED_TO_CUSTOMER → DELIVERED

Order.status = min-weight(shipment statuses)      (utils/computeOrderStatus.js)
  weights: ORDER_CREATED 0 … DELIVERED 7, CANCELLED -1, RETURNED -2
  e.g. V1=PACKED(2), V2=IN_TRANSIT(3) → Order shows PACKED_BY_VENDOR
```

### Vendor onboarding + factory QC

```
Vendor 8-step registration (web) → POST /vendors/register (base64→Cloudinary)
  → Vendor.status=PENDING → admin assigns QC checker + schedules Inspection
  → checker app: selfie+GPS → POST /inspections/:id/start (geofence check)
  → 7-step factory form + evidence photos → selfie → POST /inspections/:id/complete
  → status SUBMITTED → UNDER_ADMIN_REVIEW
  → admin approves → Vendor APPROVED (login enabled, dashboard unlocked)
     or raises reinspection → new Inspection cycle (parentInspectionId, cycleNumber+1)
  All transitions logged to InspectionAuditLog.
```

### Product listing + product QC

```
Vendor creates product (draft, gets baseSku CODE-YY-NNNNNN via Counter)
  → approvalStatus=PENDING → admin assigns checker
  → checker app: geofenced start → 8-step AQL inspection → approve/reject
  → QC_APPROVED → admin final approval (+ optional adminFixedPrice / priceINR / priceUSD)
  → APPROVED → visible on storefront (filtered by priceVisibility per region)
```

### Settlement / payout

```
Order tx creates Settlement(amount = Σ vendor basePrice × qty, status=Pending)
  → admin sets dueDate, moves Pending → Processing → Paid (with transactionId)
  → node-cron daily 09:00: dueDate < now && status ∈ {Pending, Processing}
     → admin notification "Settlement SET-… is N day(s) overdue — ₹X to Vendor Y"
```

### Push notification flow

```
Backend event (order placed, QC decision, settlement overdue…)
  → utils/notificationService.js → Notification row (in-app feed)
  → firebase-admin messaging → FCM → DeviceToken(s)
Clients: register token on login (POST /notifications/register-token),
  foreground banner / background tray / tap-routing (mobile & checker apps),
  web push via VAPID (frontend lib/firebase.ts)
```

---

## 12. Patterns & Conventions

- **Naming**: backend follows `<domain>Routes.js` → `<domain>Controller.js` pairs; frontend services mirror backend domains as `<domain>Service.ts`; React components PascalCase, grouped by portal (`AdminDashboard/`, `VendorDashboard/`, `Checker/`, `WebSite/`, `VendorHub/`). Human-readable business IDs are generated everywhere: `VND-2026-0001`, `ORD-2026-XXXXXX`, `ORD-…-V1`, `SET-…-###`, `INV-2024-25-0001`, `MNC-26-000001-A`, `QC-001`.
- **Atomic sequences**: all of the above are backed by the `Counter` collection (findAndModify-style increments) with self-healing reconciliation on unique-constraint collisions (`vendorCodeGenerator.js`).
- **API client pattern (all clients)**: one shared axios instance; request interceptor injects the right Bearer token by route/page context (web priority is path-based: `/admin*`→adminToken, `/vendor*`→vendorToken, `/checker*`→checkerToken, else userToken; mobile priority: checker/admin/vendor/user); response interceptor centralizes 401 logout-and-redirect and error toasts.
- **State without a store**: no Redux/Zustand anywhere. Web uses hooks + localStorage + `authEvents` subscription + `cart-changed` CustomEvent; mobile uses React Context (`CartContext`, `WishlistContext`) with optimistic updates and AppState-foreground re-sync.
- **Images**: everything ends up in Cloudinary. Clients send base64 data URIs; the backend deep-walks payloads (`resolveBase64InValue`) and swaps them for CDN URLs. The Next.js image pipeline uses a **custom Cloudinary loader** (`src/lib/cloudinaryLoader.ts`) with `f_auto,q_auto,w_*` transformations to avoid Vercel image-optimization quotas.
- **Error handling**: backend controllers use try/catch with JSON `{ message }` errors; there are no custom error classes or a central error middleware. Side effects (notifications, audit history) are fire-and-forget after the response-critical path.
- **Validation**: manual, in controllers and form components (no zod/joi/yup). Phone via `libphonenumber-js`, geo dropdowns via `country-state-city`.
- **Design system**: `DESIGN.md` defines tokens (brand red `#e01a1b`, Outfit font, 8px radius, six-state component matrix) that are wired into `frontend/src/app/globals.css` `@theme inline` and consumed only through Tailwind utilities (`bg-brand-500` etc.); hardcoded hex values outside the theme are prohibited by convention. Icons: Lucide across web and both mobile apps.
- **Commit style**: conventional-commit-ish with scopes — `feat(checker):`, `fix(vendor-registration):`, `sync(vendor):` (the `sync` type marks changes propagated across multiple apps).

---

## 13. Third-Party Integrations

| Service | Purpose | Code location | Credentials |
|---|---|---|---|
| **MongoDB** (Atlas) | Primary datastore via Prisma | `backend/prisma/schema.prisma`, `config/database.js` | `DATABASE_URL` |
| **Cloudinary** | All media (product images, documents, inspection photos, selfies); server-side upload + document proxy | `backend/config/cloudinary.js`; frontend `lib/cloudinaryLoader.ts` | `CLOUDINARY_*` env |
| **Razorpay** | Payments: order creation, checkout, HMAC verification, webhook | `backend/controllers/paymentController.js`; web `services/paymentService.ts`; mobile `react-native-razorpay` | env + DB `PaymentSettings` |
| **PayU** | Secondary gateway: hash generation, WebView form (partial — no webhook) | same paymentController; mobile WebView flow | `PaymentSettings` (merchantKey/salt) |
| **Firebase Cloud Messaging** | Push to web (VAPID), customer app, checker app; project `m2c-markdowns-2a6ed` | `backend/config/firebase.js` + `utils/notificationService.js`; `frontend/src/lib/firebase.ts`; `*/src/services/notificationService.ts`; `google-services.json` in both apps | `FIREBASE_SERVICE_ACCOUNT_JSON`, `NEXT_PUBLIC_FIREBASE_*` |
| **Google OAuth** | Customer & admin web SSO; native mobile Google Sign-In | `backend/config/passport.js`; `mobile` `@react-native-google-signin` | `GOOGLE_CLIENT_ID/SECRET`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| **SMTP (nodemailer)** | Verification, password reset, vendor lifecycle emails | `backend/config/connectSMTP.js`, `utils/emailService.js`, `utils/email/` | `SMTP_*` env |
| **EAS / expo-updates** | Mobile builds + OTA updates (project IDs `b8eb8431-…` mobile, `a0631327-…` checker) | `mobile/eas.json`, `checker_app/eas.json` | Expo account `asarm2c` |
| **ngrok** | Local Razorpay webhook tunnel (fixed subdomain) | `backend` `npm run dev:webhook` | — |

---

## 14. Testing

**Not found in codebase.** No test framework, no test files, no test directories in any of the four apps. `backend/package.json` has the default `"test": "echo \"Error: no test specified\" && exit 1"`. The only quasi-test artifacts are manual scripts (`backend/test-query.js`, `backend/cartQuery.js`) and seed data (`prisma/seedTestData.js`, `seedQAVendor.js`, `seedTestVendor2.js`). This is the single biggest gap given the money-handling order transaction (§11).

---

## 15. Deployment & CI/CD

- **Backend → Vercel serverless**: `backend/vercel.json` routes all paths to `api/index.js` (`@vercel/node`), which wraps the Express app. Build runs `prisma generate` (`vercel-build` script). Cold-start-safe init; no `listen()` on Vercel. Caveats: node-cron and session cleanup don't run reliably in serverless (see §16); the 30 s transaction timeout exists partly to absorb cold starts.
- **Frontend → Vercel (implied)**: standard `next build`; Cloudinary loader avoids Vercel image quotas; deploy domains appear in the backend CORS whitelist (`m2cmarkdowns.com` + vercel.app previews).
- **Mobile apps → EAS**: profiles `development` (dev-client APK), `preview` (internal), `production` (auto-increment, app bundle), `production-apk`. OTA via expo-updates keyed to app version. Android packages: `com.m2c.mobile` (customer), `com.anonymous.m2c_app` (checker — still the anonymous placeholder ID).
- **CI/CD**: **none** — no GitHub Actions/GitLab CI/Jenkins configs exist. Lint/build/deploy are manual.

---

## 16. Known Tech Debt & Observations

### 🔴 Security-sensitive (address first)

1. **`backend/debug_ps.json` contains Razorpay secrets** and is committed to the repo, alongside other debug dumps (`out.json`, `outhub.json`, `output.json`). Delete, rotate the keys, and gitignore.
2. **No `.env.example` files** — secrets knowledge is tribal; risk of real `.env` being committed to fill the gap.
3. **Firebase API keys committed** in `google-services.json`/frontend config (normal for Firebase clients, but worth confirming API-key restrictions in the Google console).
4. **Order creation is not idempotent** — a network retry after a successful commit can duplicate an order/payment linkage.
5. Web tokens live in **localStorage** (XSS-readable); the httpOnly-cookie path exists in the backend but the frontends predominantly use header tokens.

### 🟠 Reliability

6. **Zero automated tests** across ~790 source files, including the money-moving order transaction.
7. **node-cron on Vercel serverless** — the overdue-settlement job only fires if an instance happens to be warm at 9 AM; needs Vercel Cron or an external scheduler.
8. **Fire-and-forget side effects** (StockChangeHistory, notifications) have no retry — silent audit gaps on failure.
9. **No refresh tokens**; 401s silently log users out mid-task on all clients.
10. Vendor `gstNumber` uniqueness depends on a **manually-run script** (`scripts/createGstIndex.js`).
11. Mobile/checker inspection submissions send **all photos as base64 in one JSON body** (50 MB server limit, 120 s client timeout) — fragile on slow networks; no chunking/multipart, no offline draft persistence.

### 🟡 Consistency & hygiene

12. Both `bcrypt` and `bcryptjs` installed in backend — standardize on one.
13. PayU integration is half-built (hash generation exists; no webhook/confirmation handler).
14. `frontend/lint_output.txt` (475 KB) is committed; contains real findings — component defined during render in `vendor/register/page.tsx`, setState-in-effect in the checker dashboard, ~30 files with unused imports and `any`s.
15. Boilerplate READMEs (`frontend/`, `checker_app/`); no root README; this document fills that gap.
16. `checker_app` still ships the placeholder Android package `com.anonymous.m2c_app` and duplicates Android permission entries in `app.json`.
17. Mobile region defaults to `US` when `EXPO_PUBLIC_SITE_REGION` is unset — Indian users could see USD unless the env is set in builds.
18. No route-level `middleware.ts` on the web app — auth guards are per-component and easy to miss on new pages.
19. Error shapes vary between services (`throw` vs `{ success: false }`), and mock data (`components/mockData/`) plus one-off repair scripts (`prisma/fixSettlements.js`, `clearSettlements.js`) linger in the tree.
20. Multiple near-duplicate frontend routes (e.g. vendor product edit exists as both `/products/edit/[id]` and `/products/[id]/edit`).
