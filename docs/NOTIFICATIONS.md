# M2C Push Notification System — Implementation Guide

> Complete reference for sending and receiving push notifications across mobile (QC Checker app) and web (future). Covers backend triggering, FCM delivery, and client-side UI.

---

## Architecture Overview

```
┌──────────────┐     FCM HTTP v1      ┌─────────────────┐
│   Backend    │ ──────────────────▶  │  Firebase Cloud  │
│  (Node.js)   │   admin.messaging()  │   Messaging      │
└──────────────┘                      └────────┬────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              ▼                                 ▼
                     ┌────────────────┐              ┌────────────────┐
                     │  Mobile App    │              │   Web App      │
                     │  (RN Firebase) │              │  (FCM JS SDK)  │
                     └────────────────┘              └────────────────┘
```

---

## 1. Backend Setup

### Firebase Admin SDK

**File:** `backend/config/firebase.js`

```js
const admin = require("firebase-admin");

if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON env var is required");
}

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.project_id,
});

module.exports = admin;
```

**Service Account Key:**

- Generated from Firebase Console → Project Settings → Service Accounts
- Project: `m2c-markdowns-2a6ed`
- **Never committed** — loaded at runtime from the `FIREBASE_SERVICE_ACCOUNT_JSON` env var
- Local dev: paste the full JSON blob on one line in `backend/.env`, wrapped in **single quotes** so dotenv keeps `\n` sequences literal:

  ```env
  FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"m2c-markdowns-2a6ed","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}'
  ```

- Production (Vercel / Render / Railway): paste the same JSON into the host's encrypted env-var UI. No quotes needed there — the UI handles escaping.
- Rotation: Firebase Console → Service Accounts → **Generate new private key**, then replace the env var. Delete the old key in the console.

### Device Token Storage

**Schema:** `backend/prisma/schema.prisma`

```prisma
model DeviceToken {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String
  role      String   // ADMIN, VENDOR, QC_CHECKER, USER
  token     String   @unique
  platform  String   // android, ios, web
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId, role])
  @@map("device_tokens")
}
```

### Notification Service

**File:** `backend/utils/notificationService.js`

#### Core Functions

| Function                                        | Purpose                       |
| ----------------------------------------------- | ----------------------------- |
| `sendToDevice(token, {title, body, data})`      | Send to a single FCM token    |
| `sendToTokens(tokens[], {title, body, data})`   | Send to multiple tokens       |
| `sendToUser(userId, role, {title, body, data})` | Send to all devices of a user |
| `sendToRole(role, {title, body, data})`         | Send to all users with a role |

#### Pre-built Notification Helpers

```js
const { notifications } = require("../utils/notificationService");

// QC Checker notifications (mobile)
notifications.productAssigned(checkerId, productName);
notifications.vendorAssigned(checkerId, vendorName);
notifications.inspectionScheduled(checkerId, vendorName, date);

// Vendor notifications (future web)
notifications.productApproved(vendorId, productName);
notifications.productRejected(vendorId, productName, reason);
notifications.vendorStatusChanged(vendorId, status);

// Admin notifications (future web)
notifications.inspectionCompleted(vendorName, result);
```

#### FCM Message Structure

```js
await admin.messaging().send({
  token: deviceToken,
  notification: { title, body },
  data: {
    type: "PRODUCT_ASSIGNED", // for client-side routing
    screen: "products", // which screen to navigate to
  },
  android: {
    priority: "high",
    notification: {
      sound: "default",
      color: "#2563eb", // blue accent on icon
      priority: "high",
      defaultVibrateTimings: true,
      defaultSound: true,
    },
  },
  apns: {
    payload: {
      aps: { sound: "default", badge: 1 },
    },
  },
});
```

**Important:** All `data` values must be strings. The service auto-converts via `String(v)`.

### API Routes

**File:** `backend/routes/notificationRoutes.js`

| Method | Route                               | Auth | Purpose                        |
| ------ | ----------------------------------- | ---- | ------------------------------ |
| POST   | `/api/notifications/register-token` | Yes  | Register device token on login |
| DELETE | `/api/notifications/remove-token`   | Yes  | Remove token on logout         |

**Register payload:**

```json
{ "token": "fcm-device-token-string", "platform": "android" }
```

### Wired Controllers

| Controller                | Function                   | Notification                                       |
| ------------------------- | -------------------------- | -------------------------------------------------- |
| `productController.js`    | `assignQCCheckerToProduct` | `productAssigned(checkerId, productName)`          |
| `inspectionController.js` | `createInspection`         | `inspectionScheduled(checkerId, vendorName, date)` |

#### How to Add a New Notification Trigger

1. Import the service:

   ```js
   const { notifications } = require("../utils/notificationService");
   ```

2. Call after the action succeeds (fire-and-forget):

   ```js
   notifications.yourHelper(userId, ...args).catch(console.error);
   ```

3. If no pre-built helper exists, use the core function:
   ```js
   const { sendToUser } = require("../utils/notificationService");
   sendToUser(userId, "QC_CHECKER", {
     title: "Your Title",
     body: "Your message body",
     data: { type: "YOUR_TYPE", screen: "targetScreen" },
   }).catch(console.error);
   ```

### Invalid Token Cleanup

When FCM returns `messaging/registration-token-not-registered` or `messaging/invalid-registration-token`, the service **automatically deletes** the stale token from the `DeviceToken` collection. No manual cleanup needed.

---

## 2. Mobile App Setup (Checker App)

### Dependencies

```json
"@react-native-firebase/app": "installed",
"@react-native-firebase/messaging": "installed",
"expo-dev-client": "installed"
```

### Config Files

| File                                                       | Purpose                                                           |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `checker_app/google-services.json`                         | Firebase Android config (package: `com.anonymous.m2c_app`)        |
| `checker_app/app.json` → `expo.android.googleServicesFile` | Points to `./google-services.json`                                |
| `checker_app/app.json` → `expo.notification`               | Custom icon + color                                               |
| `checker_app/app.json` → `expo.plugins`                    | `@react-native-firebase/app` + `@react-native-firebase/messaging` |

### Notification Service

**File:** `checker_app/src/services/notificationService.ts`

Uses **v22 modular API** (not deprecated namespaced API):

```ts
import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  setBackgroundMessageHandler,
  getInitialNotification,
  onNotificationOpenedApp,
  requestPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
```

#### Exported Functions

| Function                                    | When to Call                  | Purpose                                                |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| `registerForPushNotifications()`            | After login                   | Request permission + get token + register with backend |
| `unregisterPushNotifications()`             | On logout                     | Remove token from backend                              |
| `setupBackgroundHandler()`                  | Top-level (outside component) | Handle background messages                             |
| `setupForegroundMessageListener(callback)`  | In root useEffect             | Show in-app notification                               |
| `setupTokenRefreshListener()`               | In root useEffect             | Re-register on token rotation                          |
| `setupNotificationOpenedListener(callback)` | In root useEffect             | Handle background tap                                  |
| `checkInitialNotification()`                | In root useEffect             | Handle cold-start tap                                  |

### Wiring in the App

#### Root Layout (`_layout.tsx`)

```tsx
import { setupBackgroundHandler, setupForegroundMessageListener, ... } from '@/services/notificationService';
import NotificationBanner from '@/components/General/NotificationBanner';

// Top-level (outside component)
setupBackgroundHandler();

export default function RootLayout() {
  const [notification, setNotification] = useState({ visible: false, title: '', body: '' });

  useEffect(() => {
    const unsub1 = setupForegroundMessageListener((title, body) => {
      setNotification({ visible: true, title, body });
    });
    const unsub2 = setupTokenRefreshListener();
    const unsub3 = setupNotificationOpenedListener((data) => { /* navigate */ });
    checkInitialNotification().then((data) => { /* navigate */ });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, []);

  return (
    <>
      <Stack>...</Stack>
      <NotificationBanner
        visible={notification.visible}
        title={notification.title}
        body={notification.body}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
      />
    </>
  );
}
```

#### Login (`Login.tsx`)

```tsx
if (result.success) {
  await qcCheckerService.storeCheckerAuth(token, checker);
  const {
    registerForPushNotifications,
  } = require("@/services/notificationService");
  registerForPushNotifications().catch(console.error);
  router.replace("/(tabs)");
}
```

### Notification UI

#### Foreground (In-App Banner)

**File:** `checker_app/src/components/General/NotificationBanner.tsx`

- Dark card (`#0f172a`) with blue bell icon
- Slides down from top with spring animation
- Auto-dismisses after 5 seconds
- ✕ close button
- Tappable (for navigation)

#### Background (System Tray)

Handled automatically by Android/iOS when the app is in the background. Styled via:

- `color: '#2563eb'` — blue accent on notification icon
- Custom notification icon — `checker_app/assets/notification-icon.png`
- Sound + vibration enabled

---

## 3. Web App Setup (Next.js Frontend)

### Step 1: Install Firebase JS SDK

```bash
cd frontend
npm install firebase
```

### Step 2: Create a Web App in Firebase Console

1. Go to **https://console.firebase.google.com/project/m2c-markdowns-2a6ed/settings/general**
2. Scroll to "Your apps" → click **Add app** → **Web** (</> icon)
3. Name: `M2C Web`
4. Copy the `firebaseConfig` object (apiKey, authDomain, projectId, etc.)
5. Save the `appId`

### Step 3: Generate VAPID Key

1. Go to **https://console.firebase.google.com/project/m2c-markdowns-2a6ed/settings/cloudmessaging**
2. Scroll to **Web Push certificates**
3. Click **Generate Key Pair**
4. Copy the public key string — this is your VAPID key

### Step 4: Create Firebase Config

Create `frontend/src/lib/firebase.ts`:

```ts
import { initializeApp, getApps } from "firebase/app";
import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from "firebase/messaging";

const firebaseConfig = {
  // from Step 2
};

// Initialize only once (Next.js hot reloads)
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export { app };
export const VAPID_KEY = "YOUR_VAPID_KEY"; // from Step 3
```

### Step 5: Create Notification Service

Create `frontend/src/services/webNotificationService.ts`:

```ts
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, VAPID_KEY } from "@/lib/firebase";
import axios from "@/lib/axios";

const TOKEN_KEY = "fcm_web_token";

/**
 * Request permission + get token + register with backend.
 * Call after user login.
 */
export async function registerWebPushToken(): Promise<string | null> {
  try {
    // Check browser supports notifications
    if (!("Notification" in window)) {
      console.log("Browser does not support notifications");
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("Notification permission denied");
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // Only re-register if token changed
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken !== token) {
      await axios.post("/notifications/register-token", {
        token,
        platform: "web",
      });
      localStorage.setItem(TOKEN_KEY, token);
      console.log("Web FCM token registered");
    }

    return token;
  } catch (error) {
    console.error("Failed to register web push:", error);
    return null;
  }
}

/**
 * Remove token from backend. Call on logout.
 */
export async function unregisterWebPushToken(): Promise<void> {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      await axios.delete("/notifications/remove-token", { data: { token } });
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.error("Failed to unregister web push:", error);
  }
}

/**
 * Listen for foreground messages. Call in your root layout/component.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (title: string, body: string, data: Record<string, string>) => void,
): () => void {
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "Notification";
    const body = payload.notification?.body || "";
    const data = (payload.data as Record<string, string>) || {};
    callback(title, body, data);
  });
}
```

### Step 6: Create Service Worker for Background Messages

Create `frontend/public/firebase-messaging-sw.js`:

```js
// Firebase compat SDK for service workers (no bundler available)
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js",
);

firebase.initializeApp({});

const messaging = firebase.messaging();

// Background message handler — browser auto-shows notification
messaging.onBackgroundMessage((payload) => {
  console.log("Background message:", payload);

  // Optional: customize the notification
  const title = payload.notification?.title || "M2C Notification";
  const options = {
    body: payload.notification?.body || "",
    icon: "/logo3.png", // your app icon in /public
    badge: "/logo64.png", // small badge icon
    data: payload.data, // passed to notification click handler
    tag: payload.data?.type || "default", // group same-type notifications
  };

  self.registration.showNotification(title, options);
});

// Handle notification click — open the relevant page
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};

  // Map notification type to URL
  const urlMap = {
    ORDER_RECEIVED: "/admin/orders",
    PRODUCT_ASSIGNED: "/checker/dashboard/products",
    VENDOR_ASSIGNED: "/checker/dashboard/vendors",
    INSPECTION_SCHEDULED: "/checker/dashboard/vendors",
    INSPECTION_COMPLETED: "/admin/inspections",
  };

  const url = urlMap[data.type] || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing tab if open
        for (const client of windowClients) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open new tab
        return clients.openWindow(url);
      }),
  );
});
```

> **Important:** Service workers can't use ES modules. Use the `compat` (namespaced) SDK with `importScripts`. This is the official Firebase recommendation.

### Step 7: Wire into Next.js Layout

In your root layout or auth-aware component (e.g., `frontend/src/app/layout.tsx` or a client component):

```tsx
"use client";

import { useEffect } from "react";
import {
  registerWebPushToken,
  onForegroundMessage,
} from "@/services/webNotificationService";
import { showSuccessToast } from "@/lib/toast-utils";

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Register token (only if logged in)
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("vendorToken");
    if (token) {
      registerWebPushToken().catch(console.error);
    }

    // Foreground messages — show toast
    const unsub = onForegroundMessage((title, body) => {
      showSuccessToast(title, body);
    });

    return () => unsub();
  }, []);

  return <>{children}</>;
}
```

Wrap your app with `<NotificationProvider>`:

```tsx
// In layout.tsx
<NotificationProvider>{children}</NotificationProvider>
```

### Step 8: Register on Login, Remove on Logout

```tsx
// After admin/vendor login success
import { registerWebPushToken } from "@/services/webNotificationService";
registerWebPushToken().catch(console.error);

// On logout
import { unregisterWebPushToken } from "@/services/webNotificationService";
await unregisterWebPushToken();
```

### Step 9: Handle Notification Click (Foreground)

When a foreground toast is clicked, navigate to the relevant page:

```tsx
onForegroundMessage((title, body, data) => {
  showSuccessToast(title, body, {
    onClick: () => {
      const urlMap: Record<string, string> = {
        ORDER_RECEIVED: "/admin/orders",
        PRODUCT_ASSIGNED: "/checker/dashboard/products",
        INSPECTION_COMPLETED: "/admin/inspections",
      };
      const url = urlMap[data.type];
      if (url) router.push(url);
    },
  });
});
```

### Backend Changes for Web

**None.** The same `notificationService.js` works for web — FCM routes to browser push when the token is a web token. Register with `platform: 'web'`.

### Web Notification Behavior Reference

| App State                              | Notification Type           | What Happens                                  |
| -------------------------------------- | --------------------------- | --------------------------------------------- |
| **Foreground** (tab active)            | All                         | `onMessage` fires → show toast/banner         |
| **Background** (tab open, not focused) | With `notification` payload | Browser auto-shows system notification        |
| **Closed** (no tab)                    | With `notification` payload | Service worker shows system notification      |
| **Click on notification**              | All                         | `notificationclick` event → opens/focuses tab |

### Browser Support

FCM web push works in all modern browsers with [Push API](https://caniuse.com/#feat=push-api) support:

- Chrome 50+
- Firefox 44+
- Edge 17+
- Safari 16.1+ (macOS Ventura+)
- **Not supported:** iOS Safari (Apple doesn't allow web push on iOS < 16.4)

### HTTPS Required

FCM web SDK **only works on HTTPS pages** (uses service workers). Localhost is exempt during development.

---

## 4. Notification Types Reference

| Type                    | Title                | Body                                | Data                     | Target     |
| ----------------------- | -------------------- | ----------------------------------- | ------------------------ | ---------- |
| `PRODUCT_ASSIGNED`      | New Product Assigned | "{name}" assigned to you            | `{ screen: 'products' }` | QC Checker |
| `VENDOR_ASSIGNED`       | New Vendor Assigned  | "{name}" assigned to you            | `{ screen: 'vendors' }`  | QC Checker |
| `INSPECTION_SCHEDULED`  | Inspection Scheduled | Inspection for "{vendor}" on {date} | `{ screen: 'vendors' }`  | QC Checker |
| `PRODUCT_APPROVED`      | Product Approved     | "{name}" has been approved          | —                        | Vendor     |
| `PRODUCT_REJECTED`      | Product Rejected     | "{name}" rejected: {reason}         | —                        | Vendor     |
| `VENDOR_STATUS_CHANGED` | Vendor {status}      | Application {status}                | —                        | Vendor     |
| `INSPECTION_COMPLETED`  | Inspection Completed | "{vendor}" — Result: {result}       | —                        | All Admins |

---

## 5. Testing

### Send Test from Backend CLI

```bash
cd backend && node -e "
const admin = require('./config/firebase');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const device = await prisma.deviceToken.findFirst({ orderBy: { createdAt: 'desc' } });
  if (!device) { console.log('No tokens'); return; }
  const result = await admin.messaging().send({
    token: device.token,
    notification: { title: 'Test', body: 'Push notifications working!' },
    data: { type: 'TEST' },
    android: { priority: 'high', notification: { sound: 'default', color: '#2563eb' } },
  });
  console.log('Sent:', result);
  await prisma.\$disconnect();
})();
"
```

### Verify Token Registration

```bash
curl http://localhost:5000/api/notifications/register-token \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"fcm-token","platform":"android"}'
```

### Check Stored Tokens

```bash
cd backend && node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.deviceToken.findMany().then(t => { console.log(JSON.stringify(t, null, 2)); p.\$disconnect(); });
"
```

---

## 6. Mobile App (`/mobile`) — Customer-Facing (Future)

The `/mobile` app is the customer-facing Expo app (shopping, orders, etc.). Notifications here target **Users** (order updates, promotions) and **Vendors** (order received, payment).

### Step 1: Install Dependencies

```bash
cd mobile
npx expo install @react-native-firebase/app @react-native-firebase/messaging expo-dev-client
```

### Step 2: Add Firebase Android App

Register a new Android app in Firebase Console with the mobile app's package name:

```bash
# Check your mobile app's package name
grep '"package"' mobile/app.json
```

Then in Firebase Console (`m2c-markdowns-2a6ed`):

- Add App → Android → enter package name
- Download `google-services.json` → save to `mobile/google-services.json`

### Step 3: Configure `app.json`

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json"
    },
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#2563eb"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ]
  }
}
```

### Step 4: Copy Notification Service

Copy from checker_app — the service is identical:

```bash
cp checker_app/src/services/notificationService.ts mobile/src/services/notificationService.ts
cp checker_app/src/components/General/NotificationBanner.tsx mobile/src/components/General/NotificationBanner.tsx
```

### Step 5: Wire into Root Layout

Same pattern as checker_app — see Section 2 above:

- Call `setupBackgroundHandler()` at top-level
- Wire `setupForegroundMessageListener` + `setupTokenRefreshListener` in root `useEffect`
- Add `<NotificationBanner />` component
- Call `registerForPushNotifications()` after user login

### Step 6: Register Token on Login

In the mobile app's login success handler:

```tsx
// After successful user/vendor login
import { registerForPushNotifications } from "@/services/notificationService";
registerForPushNotifications().catch(console.error);
```

The backend's `/api/notifications/register-token` route already handles all roles — the token is stored with the user's `role` field (`USER` or `VENDOR`), so `sendToUser()` and `sendToRole()` automatically target the right devices.

### Step 7: Add Notification Triggers to Backend Controllers

Examples for the mobile app's use cases:

```js
const { sendToUser, sendToRole } = require("../utils/notificationService");

// Order placed — notify vendor
sendToUser(vendorId, "VENDOR", {
  title: "New Order Received",
  body: `Order #${orderId} — ${itemCount} items, ₹${total}`,
  data: { type: "ORDER_RECEIVED", orderId },
});

// Order shipped — notify customer
sendToUser(customerId, "USER", {
  title: "Order Shipped",
  body: `Your order #${orderId} has been shipped!`,
  data: { type: "ORDER_SHIPPED", orderId },
});

// Payment received — notify vendor
sendToUser(vendorId, "VENDOR", {
  title: "Payment Received",
  body: `Payment of ₹${amount} for order #${orderId}`,
  data: { type: "PAYMENT_RECEIVED", orderId },
});

// Promotion — notify all users
sendToRole("USER", {
  title: "Flash Sale!",
  body: "50% off on all products. Shop now!",
  data: { type: "PROMOTION" },
});
```

### Step 8: Build

```bash
cd mobile
eas build --platform android --profile development
```

### Backend Changes Needed

**None.** The same `notificationService.js`, `notificationRoutes.js`, and `DeviceToken` model work for all apps. FCM routes messages by token — no app-specific logic needed.

### Suggested Mobile App Notification Types

| Type               | Title                | Target      | Trigger                |
| ------------------ | -------------------- | ----------- | ---------------------- |
| `ORDER_RECEIVED`   | New Order Received   | Vendor      | Customer places order  |
| `ORDER_CONFIRMED`  | Order Confirmed      | User        | Vendor confirms order  |
| `ORDER_SHIPPED`    | Order Shipped        | User        | Vendor ships order     |
| `ORDER_DELIVERED`  | Order Delivered      | User        | Delivery confirmed     |
| `ORDER_CANCELLED`  | Order Cancelled      | User/Vendor | Either party cancels   |
| `PAYMENT_RECEIVED` | Payment Received     | Vendor      | Payment processed      |
| `REVIEW_RECEIVED`  | New Review           | Vendor      | Customer leaves review |
| `PROMOTION`        | Flash Sale / Offer   | All Users   | Admin sends promo      |
| `VENDOR_APPROVED`  | Application Approved | Vendor      | Admin approves vendor  |

---

## 7. Troubleshooting

| Issue                                         | Cause                                      | Fix                                                     |
| --------------------------------------------- | ------------------------------------------ | ------------------------------------------------------- |
| No notification received                      | Token not registered                       | Check Metro logs for "FCM token registered" after login |
| "Invalid token" on dashboard                  | Expired auth session                       | Logout + login again                                    |
| Foreground: no banner                         | `setupForegroundMessageListener` not wired | Check `_layout.tsx` useEffect                           |
| Background: default icon                      | Needs rebuild with custom icon             | `eas build --platform android --profile development`    |
| Web: permission denied                        | User blocked notifications                 | Check browser settings                                  |
| `messaging/registration-token-not-registered` | App uninstalled or token rotated           | Auto-cleaned by service                                 |

---

## 8. File Map

```
backend/
├── config/firebase.js              # Firebase Admin SDK init (reads FIREBASE_SERVICE_ACCOUNT_JSON env)
├── .env                             # FIREBASE_SERVICE_ACCOUNT_JSON lives here (gitignored)
├── utils/notificationService.js     # FCM send functions + helpers
├── routes/notificationRoutes.js     # register-token / remove-token API
└── prisma/schema.prisma             # DeviceToken model

checker_app/                         # QC Checker app (implemented)
├── google-services.json             # Android Firebase config
├── assets/notification-icon.png     # Custom notification icon
├── src/services/notificationService.ts  # FCM client (v22 modular API)
├── src/components/General/NotificationBanner.tsx  # In-app banner UI
├── src/app/_layout.tsx              # Root: background handler + foreground listener
└── src/app/(auth)/Login.tsx         # Token registration on login

mobile/                              # Customer app (future — follow Section 6)
├── google-services.json             # TODO: download from Firebase Console
├── assets/notification-icon.png     # TODO: add custom icon
├── src/services/notificationService.ts  # TODO: copy from checker_app
├── src/components/General/NotificationBanner.tsx  # TODO: copy from checker_app
├── src/app/_layout.tsx              # TODO: wire listeners
└── src/app/(auth)/Login.tsx         # TODO: register token on login

frontend/                            # Web app (future — follow Section 3)
├── public/firebase-messaging-sw.js  # TODO: service worker for background
└── src/services/notificationService.ts  # TODO: Firebase JS SDK setup
```
