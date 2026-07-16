import { Leaf, Award, Wind, Sun, Home } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';

const features = [
  {
    icon: Leaf,
    title: '100% Cotton',
    description: 'Pure, natural fibers for ultimate comfort and breathability.',
  },
  {
    icon: Award,
    title: 'OEKO-TEX Certified',
    description: 'Tested for harmful substances. Safe for you and your family.',
  },
  {
    icon: Wind,
    title: 'Breathable Fabric',
    description: 'Temperature-regulating weave keeps you cool all night.',
  },
  {
    icon: Sun,
    title: 'Fade-Resistant',
    description: 'Colors stay vibrant wash after wash, year after year.',
  },
  {
    icon: Home,
    title: 'Designed for USA Homes',
    description: 'Perfect fit for standard American mattress sizes.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-8 sm:py-12 lg:py-20 px-3 sm:px-4 md:px-6 lg:px-8 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <Reveal className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
            <span className="h-px w-6 bg-[#e01a1b]" />
            Our Promise
            <span className="h-px w-6 bg-[#e01a1b]" />
          </span>
          <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] font-semibold text-[#1a1a1a] mb-2 sm:mb-3 lg:mb-4 tracking-tight">
            Why Choose M2C MarkDowns
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            We&apos;re committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail.
          </p>
        </Reveal>

        {/* Features grid — 2-col on mobile so the 5 features don't stack endlessly */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={index * 90}
              className="group text-center"
            >
              <div className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 lg:w-[68px] lg:h-[68px] bg-white rounded-2xl ring-1 ring-black/5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] mb-3 sm:mb-4 lg:mb-5 transition-all duration-500 group-hover:-translate-y-1.5 group-hover:shadow-[0_14px_30px_rgba(224,26,27,0.18)] group-hover:ring-[#e01a1b]/25">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-[#3d3d3d] transition-colors duration-300 group-hover:text-[#e01a1b]" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 break-words">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
