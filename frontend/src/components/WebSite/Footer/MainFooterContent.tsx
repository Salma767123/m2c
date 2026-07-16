'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Instagram, Facebook, Youtube, Mail, Phone, MapPin, ArrowUpRight } from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { companyInfoService, PublicCompanyInfo } from "@/services/companyInfoService";
import CompanyLogo from "@/components/Shared/CompanyLogo";
import Reveal from "@/components/WebSite/Shared/Reveal";

const MainFooterContent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo>({
    companyName: 'M2C MarkDowns Private Limited',
    companyLogo: null,
    companyEmail: null,
    companyPhone: null,
    companyWebsite: null,
    registeredAddress: null,
    city: null,
    state: null,
    country: null,
    zipCode: null,
    socialInstagram: null,
    socialFacebook: null,
    socialYoutube: null,
  });

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
    <div className="relative overflow-hidden bg-linear-to-b from-[#4d0e10] via-[#390a0c] to-[#230608] text-white">
      {/* Live accent line across the very top of the footer */}
      <div className="h-1 w-full animate-accent-bar" />

      {/* Ambient glow for depth — subtle, premium, non-interactive */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full bg-[#ff5a5b]/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 right-0 w-[28rem] h-[28rem] rounded-full bg-[#ff7a4d]/12 blur-3xl" />
      {/* Faint grid/hairline texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative max-w-7xl 2xl:max-w-420 mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-12 md:py-14 lg:py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-8 md:gap-10 lg:gap-12">
          {/* Company Info */}
          <Reveal className="text-center sm:text-left lg:col-span-1">
            <h4 className="text-white font-semibold mb-5 text-sm sm:text-base md:text-lg tracking-wide">
              Our Company
              <span className="block h-0.5 w-9 bg-[#ff8a8b] rounded-full mt-2.5 mx-auto sm:mx-0" />
            </h4>
            <div className="space-y-4 sm:space-y-5">
              <div className="inline-block">
                <Link href="/" className="block rounded-xl bg-white/95 p-2.5 ring-1 ring-white/10 transition-transform duration-300 hover:scale-[1.03]">
                  <CompanyLogo
                    className="object-cover w-28 sm:w-36 md:w-44 lg:w-48 h-auto"
                    skeletonClassName="w-28 sm:w-36 md:w-44 lg:w-48 aspect-square bg-white/10"
                    fallbackWidth={190}
                    fallbackHeight={50}
                    fallbackSizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 33vw"
                    priority
                  />
                </Link>
              </div>

              <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed max-w-xs sm:max-w-sm mx-auto sm:mx-0">
                Premium home textiles manufacturer specializing in high-quality towels, kitchen aprons, table linens, and bath accessories. Crafted with finest cotton and sustainable materials for everyday comfort and durability.
              </p>
            </div>
          </Reveal>

          {/* Navigation Links */}
          <Reveal delay={90} className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-5 text-sm sm:text-base md:text-lg tracking-wide">
              Navigation
              <span className="block h-0.5 w-9 bg-[#ff8a8b] rounded-full mt-2.5 mx-auto sm:mx-0" />
            </h4>
            <ul className="space-y-3 md:space-y-3.5">
              {[
                { href: "/", label: "Home" },
                { href: "/about", label: "About" },
                { href: "/products", label: "Products" },
                { href: "/contact", label: "Contact Us" },
              ].map((item) => (
                <li key={item.href} className="flex justify-center sm:justify-start">
                  <Link
                    href={item.href}
                    className="link-underline text-white/70 text-xs sm:text-sm md:text-base hover:text-white transition-colors duration-300"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Categories */}
          <Reveal delay={180} className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-5 text-sm sm:text-base md:text-lg tracking-wide">
              Categories
              <span className="block h-0.5 w-9 bg-[#ff8a8b] rounded-full mt-2.5 mx-auto sm:mx-0" />
            </h4>
            <ul className="space-y-3 md:space-y-3.5">
              <li className="flex justify-center sm:justify-start">
                <Link
                  href="/categories"
                  className="link-underline text-white/70 text-xs sm:text-sm md:text-base hover:text-white transition-colors duration-300"
                >
                  All Categories
                </Link>
              </li>
              {categories.map((category) => (
                <li key={category.id} className="flex justify-center sm:justify-start">
                  <Link
                    href={`/categories/${category.slug}`}
                    className="link-underline text-white/70 text-xs sm:text-sm md:text-base hover:text-white transition-colors duration-300"
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>

          {/* Contact Info */}
          <Reveal delay={270} className="text-center sm:text-left">
            <h4 className="text-white font-semibold mb-5 text-sm sm:text-base md:text-lg tracking-wide">
              Contact Info
              <span className="block h-0.5 w-9 bg-[#ff8a8b] rounded-full mt-2.5 mx-auto sm:mx-0" />
            </h4>
            <div className="space-y-4">
              {companyInfo.companyEmail && (
                <a
                  href={`mailto:${companyInfo.companyEmail}`}
                  className="group flex items-start gap-3 justify-center sm:justify-start"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#c41617]">
                    <Mail className="w-4 h-4" />
                  </span>
                  <span className="text-white/70 text-xs sm:text-sm md:text-base break-all sm:break-normal group-hover:text-white transition-colors duration-300 self-center">
                    {companyInfo.companyEmail}
                  </span>
                </a>
              )}
              {companyInfo.companyPhone && (
                <a
                  href={`tel:${companyInfo.companyPhone}`}
                  className="group flex items-start gap-3 justify-center sm:justify-start"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 text-white transition-colors duration-300 group-hover:bg-white group-hover:text-[#c41617]">
                    <Phone className="w-4 h-4" />
                  </span>
                  <span className="text-white/70 text-xs sm:text-sm md:text-base group-hover:text-white transition-colors duration-300 self-center">
                    {companyInfo.companyPhone}
                  </span>
                </a>
              )}
              {buildAddress() && (
                <div className="flex items-start gap-3 justify-center sm:justify-start">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15 text-white">
                    <MapPin className="w-4 h-4" />
                  </span>
                  <p className="text-white/70 text-xs sm:text-sm md:text-base leading-relaxed max-w-xs sm:max-w-[13rem] text-center sm:text-left">
                    {buildAddress()}{companyInfo.zipCode ? ` – ${companyInfo.zipCode}` : ''}
                  </p>
                </div>
              )}

              {/* Social Media Icons */}
              {(companyInfo.socialInstagram || companyInfo.socialFacebook || companyInfo.socialYoutube) && (
                <div className="flex justify-center sm:justify-start gap-3 pt-2">
                  {[
                    { url: companyInfo.socialInstagram, Icon: Instagram, label: "Instagram" },
                    { url: companyInfo.socialFacebook, Icon: Facebook, label: "Facebook" },
                    { url: companyInfo.socialYoutube, Icon: Youtube, label: "YouTube" },
                  ]
                    .filter((s) => s.url)
                    .map(({ url, Icon, label }) => (
                      <a
                        key={label}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-white hover:text-[#c41617] hover:bg-white hover:ring-white hover:-translate-y-1 hover:shadow-[0_10px_28px_rgba(0,0,0,0.45)] transition-all duration-300"
                        aria-label={label}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </a>
                    ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>

        {/* Brand statement strip — modern hairline divider + tagline */}
        <div className="mt-10 sm:mt-12 lg:mt-16 pt-6 sm:pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <p className="font-playfair text-lg sm:text-xl md:text-2xl text-white/90 tracking-tight">
            From Manufacturer <span className="text-[#ff8a8b] italic">to</span> your Home.
          </p>
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 text-sm font-semibold text-white/80 hover:text-white transition-colors duration-300"
          >
            Explore the collection
            <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MainFooterContent;