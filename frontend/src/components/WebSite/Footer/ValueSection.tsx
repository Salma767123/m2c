import { Leaf, Award, Wind, Sun, Home, ShieldCheck, Heart, ShoppingCart, ShoppingBag } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

/**
 * "Why Choose M2C MarkDowns" — compact premium brand-promise section. Five
 * benefits as solid gradient icon-orbs (each with its own accent + reflection)
 * split by hairline dividers, over a warm blush panel dressed with subtle
 * floating sparkle accents, and closed by a floating white trust pill. All
 * motion is CSS-only and reduced-motion safe; copy/icons unchanged.
 */
const features = [
  { icon: Leaf, title: '100% Cotton', description: 'Pure, natural fibers for ultimate comfort and breathability.', from: '#F0453B', to: '#D5191F' },
  { icon: Award, title: 'OEKO-TEX Certified', description: 'Tested for harmful substances. Safe for you and your family.', from: '#4C60D8', to: '#2E3FAF' },
  { icon: Wind, title: 'Breathable Fabric', description: 'Temperature-regulating weave keeps you cool all night.', from: '#6FC24A', to: '#48A22C' },
  { icon: Sun, title: 'Fade-Resistant', description: 'Colors stay vibrant wash after wash, year after year.', from: '#F9B23D', to: '#F1911C' },
  { icon: Home, title: 'Designed for USA Homes', description: 'Perfect fit for standard American mattress sizes.', from: '#9C6DF0', to: '#7C3AED' },
];

const trust = [
  { icon: ShieldCheck, title: 'Quality Assured', copy: 'Strict quality checks', ring: '#ECEEFE', color: '#5B6BF0' },
  { icon: Heart, title: '10K+ Happy Homes', copy: 'Trusted by thousands', ring: '#FCEAEA', color: '#E01A1B' },
  { icon: Leaf, title: 'Sustainable Choice', copy: 'Better for you & planet', ring: '#E9F6E7', color: '#4BA62F' },
];

export default function WhyChooseUs() {
  return (
    <section className="bg-white px-3 py-7 sm:px-4 sm:py-9 lg:px-8">
      <style>{`
        @keyframes wcFloat { 0%,100% { transform: translateY(0) rotate(var(--r,0deg)) } 50% { transform: translateY(-9px) rotate(var(--r,0deg)) } }
        @media (prefers-reduced-motion: reduce) { .wc-anim { animation: none !important; } }
      `}</style>

      <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[22px] bg-[radial-gradient(120%_120%_at_15%_10%,#FBEDE6_0%,#FCF2EC_38%,#FDF6F1_62%,#FBEDE7_100%)] px-4 py-9 shadow-[0_18px_50px_-38px_rgba(120,60,40,0.35)] sm:px-8 sm:py-11 lg:px-10 lg:py-14">
        {/* ── Decorative layer — subtle e-commerce sparkle accents ───────── */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -left-16 -top-12 h-56 w-56 rounded-full bg-[radial-gradient(circle,#FFFFFF_0%,transparent_70%)] opacity-70 blur-xl" />
          <div className="absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,#F7DED6_0%,transparent_70%)] opacity-60 blur-xl" />
          {/* floating shopping-bag icon (top-right) */}
          <div className="wc-anim absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-2xl bg-white/70 shadow-[0_8px_20px_-8px_rgba(120,80,60,0.3)] ring-1 ring-white/70 backdrop-blur-sm sm:right-9" style={{ animation: 'wcFloat 9s ease-in-out infinite' }}>
            <ShoppingBag className="h-5 w-5 text-[#C7A66A]" strokeWidth={1.8} />
          </div>
          {/* scattered mini carts & bags */}
          <ShoppingCart className="wc-anim absolute left-[7%] top-[38%] h-4 w-4 text-[#C7A66A]/70" style={{ animation: 'wcFloat 11s ease-in-out infinite' }} strokeWidth={1.7} />
          <ShoppingBag className="wc-anim absolute left-[5%] bottom-[20%] h-5 w-5 text-[#E0A8A0]/70" style={{ animation: 'wcFloat 13s ease-in-out infinite' }} strokeWidth={1.7} />
          <ShoppingCart className="wc-anim absolute right-[8%] top-[46%] h-4 w-4 text-[#C7A66A]/60" style={{ animation: 'wcFloat 12s ease-in-out infinite' }} strokeWidth={1.7} />
          <ShoppingBag className="wc-anim absolute left-[24%] top-[14%] h-3.5 w-3.5 text-[#C7A66A]/50" style={{ animation: 'wcFloat 15s ease-in-out infinite' }} strokeWidth={1.7} />
          {/* soft particle dots */}
          <div className="absolute left-[5%] top-[10%] h-1.5 w-1.5 rounded-full bg-[#E9B7AE] opacity-60" />
          <div className="absolute right-[22%] top-[16%] h-1 w-1 rounded-full bg-[#C7A66A] opacity-60" />
          <div className="absolute right-[14%] bottom-[24%] h-1.5 w-1.5 rounded-full bg-[#E9B7AE] opacity-50" />
        </div>

        <div className="relative mx-auto max-w-5xl">
          {/* ── Intro ──────────────────────────────────────────────────── */}
          <Reveal className="mx-auto mb-8 max-w-xl text-center sm:mb-10">
            <span className="mb-3 inline-flex items-center gap-2.5 text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#E01A1B]">
              <span className="h-px w-6 bg-[#E01A1B]/70" />
              Our Promise
              <span className="h-px w-6 bg-[#E01A1B]/70" />
            </span>
            <h2 className="text-[1.6rem] font-extrabold leading-[1.1] tracking-tight text-[#152036] sm:text-[2rem] lg:text-[2.4rem]">
              Why Choose M2C MarkDowns
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[13px] leading-relaxed text-[#4A5570] sm:text-[14.5px]">
              We&apos;re committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail.
            </p>
          </Reveal>

          {/* ── Benefits row ───────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-y-8 lg:grid-cols-5 lg:gap-y-0 lg:divide-x lg:divide-[#EADBCE]">
            {features.map((feature, index) => (
              <Reveal key={feature.title} delay={index * 100} className="group px-2.5 sm:px-3 lg:px-4">
                <div className="flex flex-col items-center text-center">
                  {/* Icon orb + reflection */}
                  <div className="relative mb-5">
                    <div
                      className="wc-anim relative grid h-[52px] w-[52px] place-items-center rounded-full transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110 sm:h-[56px] sm:w-[56px]"
                      style={{
                        animation: `wcFloat ${8 + index}s ease-in-out infinite`,
                        animationDelay: `${index * 0.5}s`,
                        background: `linear-gradient(145deg, ${feature.from} 0%, ${feature.to} 100%)`,
                        boxShadow: `0 12px 22px -10px ${feature.to}9c, inset 0 2px 3px rgba(255,255,255,0.35)`,
                      }}
                    >
                      <feature.icon className="h-[22px] w-[22px] text-white sm:h-6 sm:w-6" strokeWidth={1.9} />
                    </div>
                    {/* soft reflection ellipse */}
                    <span
                      className="absolute -bottom-3 left-1/2 h-2 w-11 -translate-x-1/2 rounded-[50%] opacity-35 blur-[4px] transition-opacity duration-500 group-hover:opacity-60"
                      style={{ background: feature.to }}
                    />
                  </div>

                  <h3 className="mb-1.5 text-[13.5px] font-bold tracking-tight text-[#1C2A49] sm:text-[15px]">
                    {feature.title}
                  </h3>
                  <p className="max-w-[13rem] text-[11.5px] leading-relaxed text-[#6B7280] sm:text-[12.5px]">
                    {feature.description}
                  </p>
                  {/* accent underline */}
                  <span className="mt-3 block h-[2.5px] w-7 rounded-full transition-all duration-300 group-hover:w-10" style={{ background: feature.to }} />
                </div>
              </Reveal>
            ))}
          </div>

          {/* ── Floating white trust pill ──────────────────────────────── */}
          <Reveal delay={200} className="mt-9 sm:mt-12">
            <div className="mx-auto max-w-2xl rounded-[20px] bg-white p-1.5 shadow-[0_22px_50px_-28px_rgba(60,40,30,0.35)]">
              <div className="grid grid-cols-1 divide-y divide-[#F0EAE2] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                {trust.map(({ icon: Icon, title, copy, ring, color }) => (
                  <div key={title} className="group flex items-center gap-2.5 px-4 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform duration-300 group-hover:scale-105" style={{ background: ring }}>
                      <Icon className="h-4 w-4" strokeWidth={2} style={{ color }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold leading-tight text-[#1C2A49]">{title}</span>
                      <span className="block text-[11.5px] leading-tight text-[#8A8F9C]">{copy}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
