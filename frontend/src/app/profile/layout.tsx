import Header from "@/components/WebSite/Header/Header"
import Footer from "@/components/WebSite/Footer/Footer"

/**
 * /profile was the only customer-facing page in the app with no footer. Home,
 * About, Products and Wishlist all render Header → content → Footer; this
 * rendered a Header and then simply stopped, so the bottom of the account page
 * was bare page ground. That, not the background colour, is what read as
 * "plain".
 *
 * Two supporting changes:
 *
 *  · Flex column with `main` on flex-1, so when the account content is short
 *    the footer is pushed to the bottom of the viewport instead of floating
 *    halfway up the screen.
 *
 *  · The wrapper ground is the account page's own linen rather than white.
 *    Profile carries `min-h-[60vh]`, not `min-h-screen` — it used to force a
 *    full viewport of its own on top of this one's, which guaranteed a screen
 *    of empty space no matter how little content there was. Any slack now
 *    shows this colour, which matches, instead of a white band.
 */
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#faf7f3]">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
