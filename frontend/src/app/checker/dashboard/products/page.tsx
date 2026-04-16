import { Suspense } from 'react'
import Products from '@/components/Checker/Products/Products'

export default function CheckerProductsPage() {
    return (
        <Suspense fallback={null}>
            <Products />
        </Suspense>
    )
}
