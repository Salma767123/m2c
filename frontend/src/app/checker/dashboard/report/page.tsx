"use client"

import { Suspense } from "react"
import Report from "@/components/Checker/Report/Report"

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222222]" />
      </div>
    }>
      <Report />
    </Suspense>
  )
}
