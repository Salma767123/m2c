'use client';
import Link from 'next/link';
import ProductCard from '@/components/WebSite/ProductCard/ProductCard';
import { products, Product as MockProduct } from '@/components/mockData/products';

export default function BestSeller() {
  // Sort by rating (descending) to get best seller products
  const bestSellerProducts: MockProduct[] = products
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 4);

  return (
    <section className="bg-white py-8 sm:py-12 md:py-16 lg:py-20 font-sans">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-10 md:mb-12 lg:mb-16">
          <div className="text-center lg:text-left flex-1">
            <h2 className="text-lg sm:text-xl md:text-2xl xl:text-3xl font-bold text-[#313131] mb-2 md:mb-3">
              Best Seller Products
            </h2>
            <p className="text-sm sm:text-sm md:text-base lg:text-lg text-gray-500 max-w-full lg:max-w-2xl xl:max-w-3xl mx-auto lg:mx-0 leading-relaxed">
              Highest rated products that have earned our customers' trust and satisfaction
            </p>
          </div>
          
          {/* View All Button */}
          <div className="flex justify-center lg:justify-end lg:ml-8 shrink-0">
            <Link 
              href="/products"
              className="inline-block bg-gray-700 text-white px-4 sm:px-6 md:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-xs sm:text-sm md:text-base whitespace-nowrap transform hover:scale-105 duration-200"
            >
              <span className="hidden sm:inline">View All Products</span>
              <span className="sm:hidden">View All</span>
            </Link>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8">
          {bestSellerProducts.map((product) => (
            <div key={product.id} className="w-full">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        {/* Mobile View All Button (Bottom) */}
        <div className="flex justify-center mt-8 sm:mt-10 md:mt-12 lg:hidden">
          <Link 
            href="/products"
            className="inline-block bg-gray-700 text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm sm:text-base transform hover:scale-105 duration-200"
          >
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}
