'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Instagram, Facebook, Youtube } from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { companyInfoService, PublicCompanyInfo } from "@/services/companyInfoService";

const MainFooterContent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo>(() => companyInfoService.getCachedCompanyInfo());

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await categoryService.getAllCategories({
          status: 'ACTIVE',
          showRootOnly: 'true'
        });
        if (response.success && response.data) {
          setCategories(response.data.slice(0, 6));
        }
      } catch (error) {
        console.error("Failed to fetch categories for footer:", error);
      }
    };

    fetchCategories();
    companyInfoService.getPublicCompanyInfo().then(info => {
      setCompanyInfo(info);
    }).catch(() => {});
  }, []);

  const buildAddress = () => {
    const parts = [companyInfo.registeredAddress, companyInfo.city, companyInfo.state, companyInfo.country].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <div className="bg-[#000000] text-white">
      <div className="max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 sm:py-10 md:py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 :grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8 md:gap-10 lg:gap-12">
          {/* Company Info */}
          <div className="text-center sm:text-left lg:col-span-1">
            <h4 className="text-white font-semibold mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
              Our Company
            </h4>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              <div className="bg-white p-2 sm:p-3 rounded-lg inline-block">
                <Link href="/" className="block">
                  {companyInfo.companyLogo ? (
                    <img
                      src={companyInfo.companyLogo}
                      alt="Company Logo"
                      className="object-cover w-32 sm:w-40 md:w-48 lg:w-52 h-auto"
                    />
                  ) : (
                    <Image
                      src="/assets/logo/m2c-logo.png"
                      alt="Company Logo"
                      width={190}
                      height={50}
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                      className="object-cover w-32 sm:w-40 md:w-48 lg:w-52 h-auto"
                      priority
                    />
                  )}
                </Link>
              </div>

              <p className="text-gray-200 text-xs sm:text-sm md:text-base leading-relaxed max-w-xs sm:max-w-sm mx-auto sm:mx-0">
                Premium home textiles manufacturer specializing in high-quality towels, kitchen aprons, table linens, and bath accessories. Crafted with finest cotton and sustainable materials for everyday comfort and durability.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="text-center">
            <h4 className="text-white font-semibold mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
              Navigation
            </h4>
            <ul className="space-y-2 sm:space-y-3 md:space-y-4">
              <li>
                <Link
                  href="/"
                  className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/about"
                  className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/products"
                  className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                >
                  Products
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                >
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div className="text-center">
            <h4 className="text-white font-semibold mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
              Categories
            </h4>
            <ul className="space-y-2 sm:space-y-3 md:space-y-4">
              <li>
                <Link
                  href="/categories"
                  className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                >
                  All Categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}`}
                    className="text-gray-200 text-xs sm:text-sm md:text-base hover:text-white transition-colors block py-1"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-4 sm:mb-6 text-sm sm:text-base md:text-lg">
              Contact Info
            </h4>
            <div className="space-y-3 sm:space-y-4 md:space-y-6">
              {companyInfo.companyEmail && (
                <div>
                  <p className="text-gray-200 text-xs sm:text-sm md:text-base break-all sm:break-normal">
                    {companyInfo.companyEmail}
                  </p>
                </div>
              )}
              {companyInfo.companyPhone && (
                <div>
                  <p className="text-gray-200 text-xs sm:text-sm md:text-base">
                    {companyInfo.companyPhone}
                  </p>
                </div>
              )}
              {buildAddress() && (
                <div>
                  <p className="text-gray-200 text-xs sm:text-sm md:text-base leading-relaxed max-w-xs sm:max-w-sm mx-auto sm:mx-0">
                    {buildAddress()}{companyInfo.zipCode ? ` – ${companyInfo.zipCode}` : ''}
                  </p>
                </div>
              )}

              {/* Social Media Icons */}
              {(companyInfo.socialInstagram || companyInfo.socialFacebook || companyInfo.socialYoutube) && (
                <div className="flex justify-center sm:justify-start space-x-3 sm:space-x-4 pt-2 sm:pt-4">
                  {companyInfo.socialInstagram && (
                    <a
                      href={companyInfo.socialInstagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#3d3d3d] rounded-full flex items-center justify-center text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {companyInfo.socialFacebook && (
                    <a
                      href={companyInfo.socialFacebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#3d3d3d] rounded-full flex items-center justify-center text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                  {companyInfo.socialYoutube && (
                    <a
                      href={companyInfo.socialYoutube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-[#3d3d3d] rounded-full flex items-center justify-center text-gray-200 hover:bg-gray-600 hover:text-white transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="w-4 h-4 sm:w-5 sm:h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainFooterContent;