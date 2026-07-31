'use client'

import Header from '@/components/WebSite/Header/Header'
import Footer from '@/components/WebSite/Footer/Footer'
import Breadcrumb from '@/components/WebSite/Navigation/Breadcrumb'
import OffersGrid from '@/components/WebSite/Offers/OffersGrid'

export default function OffersPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Breadcrumb items={[{ label: 'Offers' }]} />
      <OffersGrid />
      <Footer />
    </div>
  )
}
