import Checkout from "@/components/WebSite/CheckOut/Checkout"
import Header from "@/components/WebSite/Header/Header"
import Footer from "@/components/WebSite/Footer/Footer"

export default function CheckoutPage() {
  return (
    // White, because the checkout paints its own two grounds now: the flow on
    // white and the order panel dark. A grey wrapper behind them showed only
    // as a seam under the footer.
    <div className="min-h-screen bg-[#faf6f2]">
      <Header />
      <Checkout />
      <Footer />
    </div>

)
}

export const metadata = {
  title: "Checkout - Complete Your Order",
  description: "Secure checkout process with multiple payment options and fast delivery.",
}