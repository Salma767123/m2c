"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Product inspection report detail is intentionally NOT viewable by QC checkers.
 * The reports list no longer links here, and any direct navigation is redirected
 * back to the Product Inspection Reports tab.
 */
export default function ProductReportPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/checker/dashboard/report?tab=product")
  }, [router])

  return null
}
