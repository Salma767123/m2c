import { Suspense } from 'react'
import Header from "@/components/WebSite/Header/Header"
import Footer from "@/components/WebSite/Footer/Footer"
import OrderConfirmation from "@/components/WebSite/Order/OrderConfirmation"
import { Loader2 } from "lucide-react"

export default function OrderConfirmationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }>
        <OrderConfirmation />
      </Suspense>
      <Footer />
    </div>
  )
}

export const metadata = {
  title: "Order Confirmation",
  description: "View your order details and status.",
}
