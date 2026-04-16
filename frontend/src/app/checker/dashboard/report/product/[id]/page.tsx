"use client"

import { use } from "react"
import { useRouter } from "next/navigation"
import ProductReportDetail from "@/components/Checker/Report/ProductReportDetail"

interface ProductReportPageProps {
  params: Promise<{
    id: string
  }>
}

export default function ProductReportPage({ params }: ProductReportPageProps) {
  const router = useRouter()
  const { id } = use(params)

  return (
    <ProductReportDetail
      productId={id}
      onBack={() => router.push("/checker/dashboard/report?tab=product")}
    />
  )
}
