'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Instagram, Facebook, Youtube, Mail, Phone, ArrowRight,
  Truck, ShieldCheck, Award, Leaf,
} from "lucide-react";
import { categoryService, Category } from "@/services/categoryService";
import { companyInfoService, PublicCompanyInfo } from "@/services/companyInfoService";
import CompanyLogo from "@/components/Shared/CompanyLogo";
import Reveal from "@/components/WebSite/Shared/Reveal";
import { showSuccessToast } from "@/lib/toast-utils";

const RED = "#e01a1b";

/** Column heading — compact uppercase label with a short red→gold accent rule. */
const ColHeading = ({ children }: { children: React.ReactNode }) => (
  <h4 className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#26262a]">
    {children}
    <span className="mt-2.5 block h-[2px] w-7 rounded-full bg-gradient-to-r from-[#e01a1b] to-[#c9962f]" />
  </h4>
);

/**
 * Footer nav link. The arrow sits directly beside the label (inline-flex +
 * small gap + w-fit) — it belongs to the link and never stretches to the far
 * edge of the column. On hover the text turns brand-red, a hairline underline
 * grows, and the arrow nudges right.
 */
const NavLink = ({ href, label }: { href: string; label: string }) => (
  <Link
    href={href}
    className="group inline-flex w-fit items-center gap-3 text-[15px] leading-none text-[#3f3f46] transition-colors duration-200 hover:text-[#e01a1b]"
  >
    <span className="relative py-0.5">
      {label}
      <span className="absolute -bottom-px left-0 h-px w-0 bg-[#e01a1b] transition-all duration-200 group-hover:w-full" />
    </span>
    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#c9962f]/70 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#e01a1b]" />
  </Link>
);

const MainFooterContent = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [email, setEmail] = useState("");
  const [companyInfo, setCompanyInfo] = useState<PublicCompanyInfo>({
    companyName: 'M2C MarkDowns Private Limited',
    companyLogo: null,
    secondaryLogo: null,
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
    categoryService.getAllCategories({ status: 'ACTIVE', showRootOnly: 'true' })
      .then((res) => { if (res.success && res.data) setCategories(res.data.slice(0, 6)); })
      .catch((e) => console.error("Failed to fetch categories for footer:", e));
    companyInfoService.getPublicCompanyInfo().then(setCompanyInfo).catch(() => {});
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    showSuccessToast("Subscribed", "You're on the list — new arrivals & offers are on the way.");
    setEmail("");
  };

  // Round social icon buttons (Our Company column).
  const socials = [
    { url: companyInfo.socialInstagram, Icon: Instagram, label: "Instagram" },
    { url: companyInfo.socialFacebook, Icon: Facebook, label: "Facebook" },
    { url: companyInfo.socialYoutube, Icon: Youtube, label: "YouTube" },
  ].filter((s) => s.url) as { url: string; Icon: typeof Instagram; label: string }[];

  // Social links shown as labelled rows (Let's Connect column).
  const connectSocials = [
    { url: companyInfo.socialInstagram, Icon: Instagram, label: "Instagram" },
    { url: companyInfo.socialFacebook, Icon: Facebook, label: "Facebook" },
  ].filter((s) => s.url) as { url: string; Icon: typeof Instagram; label: string }[];

  const trust = [
    { Icon: Truck, title: "Fast Delivery", sub: "Pan-India shipping" },
    { Icon: ShieldCheck, title: "Secure Payment", sub: "100% protected" },
    { Icon: Award, title: "Best Quality", sub: "Finest cotton" },
    { Icon: Leaf, title: "Sustainable", sub: "Eco-friendly craft" },
  ];

  return (
    <div className="relative overflow-hidden bg-[#faf9f6] text-[#3f3f46]">
      {/* Brand hairline across the very top — subtle continuity with the site. */}
      <div
        className="h-px w-full"
        style={{ background: "linear-gradient(90deg, transparent, rgba(224,26,27,0.25), rgba(224,26,27,0.7), rgba(224,26,27,0.25), transparent)" }}
      />

      {/* ── Abstract, technology-inspired background pattern (very low opacity) ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 footer-grid opacity-60" />
      <div aria-hidden className="pointer-events-none absolute inset-0 footer-dots opacity-70" />
      {/* Soft warm/red radial washes for depth */}
      <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-[#e01a1b]/[0.04] blur-[100px]" />
      <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-[26rem] w-[26rem] rounded-full bg-[#c9962f]/[0.07] blur-[110px]" />
      {/* Abstract curved contour lines (drift slowly) */}
      <svg aria-hidden className="footer-contour pointer-events-none absolute right-0 top-4 hidden h-72 w-[30rem] text-[#c9962f] lg:block" viewBox="0 0 480 300" fill="none">
        <path d="M470 10 C 360 60, 440 150, 300 190 S 150 250, 40 290" stroke="currentColor" strokeWidth="1" strokeOpacity="0.18" strokeLinecap="round" />
        <path d="M478 70 C 380 110, 430 190, 300 230" stroke="currentColor" strokeWidth="1" strokeOpacity="0.13" strokeLinecap="round" />
        <path d="M470 130 C 400 160, 420 220, 340 260" stroke={RED} strokeWidth="1" strokeOpacity="0.08" strokeLinecap="round" />
      </svg>

      <div className="relative mx-auto max-w-7xl xl:max-w-420 px-4 sm:px-6 lg:px-8 pt-14 pb-6 sm:pt-16">
        {/* ── Brand promise / intro ─────────────────────────────────────── */}
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="inline-flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#c9962f]">
            <span className="inline-block h-px w-8 bg-gradient-to-r from-transparent to-[#c9962f]" />
            Our Promise
            <span className="inline-block h-px w-8 bg-gradient-to-l from-transparent to-[#c9962f]" />
          </p>
          <h2 className="mt-4 font-playfair text-3xl font-semibold leading-[1.14] text-[#1c1c1e] sm:text-4xl md:text-[42px]">
            From Manufacturer to your{' '}
            <span className="relative whitespace-nowrap italic text-[#e01a1b]">
              Home.
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 120 12" fill="none" preserveAspectRatio="none">
                <path d="M2 8 C 30 2, 90 2, 118 6" stroke="#e01a1b" strokeOpacity="0.55" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#5b5b63] sm:text-[15px]">
            Premium home textiles crafted with finest cotton and sustainable materials for everyday comfort and durability.
          </p>
        </Reveal>

        {/* ── Main grid: Company · Explore · Categories · Let's Connect · Stay Updated ── */}
        <div className="mt-14 grid grid-cols-1 gap-x-8 gap-y-11 sm:grid-cols-2 lg:grid-cols-12 lg:gap-x-10">
          {/* Our Company */}
          <Reveal className="min-w-0 sm:col-span-2 lg:col-span-3">
            <Link href="/" className="inline-block">
              <CompanyLogo
                className="h-11 w-auto object-contain sm:h-12"
                skeletonClassName="h-11 sm:h-12 w-36 bg-black/5"
                fallbackWidth={190}
                fallbackHeight={48}
              />
            </Link>
            <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-[#5b5b63]">
              Premium home textiles manufacturer specializing in high-quality towels, kitchen aprons, table linens and bath accessories — crafted with finest cotton and sustainable materials for everyday comfort.
            </p>
            <Link
              href="/about"
              className="group mt-5 inline-flex items-center gap-2 rounded-full border border-[#e2e0da] bg-white px-5 py-2 text-[13px] font-semibold text-[#26262a] transition-all duration-200 hover:border-[#e01a1b] hover:text-[#e01a1b] hover:shadow-[0_3px_14px_rgba(224,26,27,0.12)]"
            >
              About M2C
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </Link>

            {socials.length > 0 && (
              <div className="mt-6 flex items-center gap-2.5">
                {socials.map(({ url, Icon, label }) => (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e0da] bg-white text-[#52525b] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:border-[#e01a1b] hover:text-[#e01a1b]"
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </a>
                ))}
              </div>
            )}
          </Reveal>

          {/* Explore */}
          <Reveal delay={80} className="min-w-0 lg:col-span-2">
            <ColHeading>Explore</ColHeading>
            <div className="mt-5 flex flex-col items-start gap-3.5">
              <NavLink href="/" label="Home" />
              <NavLink href="/about" label="About" />
              <NavLink href="/products" label="Products" />
              <NavLink href="/contact" label="Contact Us" />
            </div>
          </Reveal>

          {/* Categories */}
          <Reveal delay={160} className="min-w-0 lg:col-span-2">
            <ColHeading>Categories</ColHeading>
            <div className="mt-5 flex flex-col items-start gap-3.5">
              <NavLink href="/categories" label="All Categories" />
              {categories.map((c) => (
                <NavLink key={c.id} href={`/categories/${c.slug}`} label={c.name} />
              ))}
            </div>
          </Reveal>

          {/* Let's Connect */}
          <Reveal delay={240} className="min-w-0 lg:col-span-2">
            <ColHeading>Let&apos;s Connect</ColHeading>
            <div className="mt-5 flex flex-col items-start gap-3.5">
              {companyInfo.companyEmail && (
                <a
                  href={`mailto:${companyInfo.companyEmail}`}
                  className="group inline-flex w-full max-w-full items-center gap-2.5 text-[14px] text-[#3f3f46] transition-colors duration-200 hover:text-[#e01a1b]"
                >
                  <Mail className="h-4 w-4 shrink-0 text-[#c9962f]/80 transition-colors group-hover:text-[#e01a1b]" />
                  <span className="min-w-0 truncate">{companyInfo.companyEmail}</span>
                </a>
              )}
              {companyInfo.companyPhone && (
                <a
                  href={`tel:${companyInfo.companyPhone}`}
                  className="group inline-flex w-fit items-center gap-2.5 text-[14px] text-[#3f3f46] transition-colors duration-200 hover:text-[#e01a1b]"
                >
                  <Phone className="h-4 w-4 shrink-0 text-[#c9962f]/80 transition-colors group-hover:text-[#e01a1b]" />
                  <span>{companyInfo.companyPhone}</span>
                </a>
              )}
              {connectSocials.map(({ url, Icon, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex w-fit items-center gap-2.5 text-[14px] text-[#3f3f46] transition-colors duration-200 hover:text-[#e01a1b]"
                >
                  <Icon className="h-4 w-4 shrink-0 text-[#c9962f]/80 transition-colors group-hover:text-[#e01a1b]" />
                  <span>{label}</span>
                </a>
              ))}
            </div>
          </Reveal>

          {/* Stay Updated — newsletter */}
          <Reveal delay={320} className="min-w-0 sm:col-span-2 lg:col-span-3">
            <ColHeading>Stay Updated</ColHeading>
            <form
              onSubmit={handleSubscribe}
              className="mt-5 rounded-2xl border border-[#e8e6df] bg-white/80 p-4 shadow-[0_1px_3px_rgba(20,20,20,0.04)] backdrop-blur-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e01a1b]/[0.07] text-[#e01a1b]">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-[#26262a]">Get the latest from M2C</p>
                  <p className="text-[12.5px] text-[#71717a]">New arrivals, offers &amp; more.</p>
                </div>
              </div>
              <div className="mt-3.5 flex items-center gap-2 rounded-full border border-[#e2e0da] bg-[#faf9f6] py-1 pl-4 pr-1 transition-colors focus-within:border-[#e01a1b]/45 focus-within:bg-white">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  aria-label="Email address"
                  className="min-w-0 flex-1 bg-transparent text-sm text-[#26262a] placeholder-[#a1a1aa] outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e01a1b] text-white transition-all duration-200 hover:scale-105 hover:bg-[#c41617]"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </Reveal>
        </div>

        {/* ── Trust strip ──────────────────────────────────────────────── */}
        <Reveal className="mt-14 border-t border-[#eceae4] pt-7">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-8">
            {trust.map(({ Icon, title, sub }) => (
              <div key={title} className="inline-flex items-center gap-2.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e01a1b]/[0.06] text-[#e01a1b]">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold leading-tight text-[#26262a]">{title}</p>
                  <p className="text-[11.5px] leading-tight text-[#8a8a92]">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
};

export default MainFooterContent;
