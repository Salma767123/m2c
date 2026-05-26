import { Leaf, Award, Wind, Sun, Home } from 'lucide-react';

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
    <section className="py-8 sm:py-12 lg:py-16 px-3 sm:px-4 md:px-6 lg:px-8 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-6 sm:mb-8 md:mb-12 lg:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">
            Why Choose M2C MarkDowns
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
            We&apos;re committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail.
          </p>
        </div>

        {/* Features grid — 2-col on mobile so the 5 features don't stack endlessly */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 bg-white rounded-2xl shadow-lg mb-3 sm:mb-4 lg:mb-5">
                <feature.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-[#3d3d3d]" />
              </div>
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-1.5 sm:mb-2 break-words">
                {feature.title}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
