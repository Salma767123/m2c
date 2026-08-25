import { Suspense } from "react"
import Profile from "@/components/WebSite/Profile/Profile"

export default function ProfilePage() {
  // Profile reads useSearchParams() (?tab= deep-link), which must sit inside a
  // Suspense boundary or the static prerender of /profile fails the build.
  return (
    <Suspense fallback={null}>
      <Profile />
    </Suspense>
  )
}

export const metadata = {
  title: "My Profile - Account Settings",
  description: "Manage your profile, orders, wishlist, payment methods, and account settings.",
}
