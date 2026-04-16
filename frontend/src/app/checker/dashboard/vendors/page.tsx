"use client"

import { useState, Suspense } from "react"
import VendorList from "@/components/Checker/Vendor/VendorList"

export default function VendorsPage() {
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null)

  return (
    <Suspense fallback={<div className="p-6">Loading vendors...</div>}>
      <VendorList 
        selectedVendor={selectedVendor}
        onVendorSelect={setSelectedVendor}
      />
    </Suspense>
  )
}