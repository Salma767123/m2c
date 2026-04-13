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
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-t  border-gray-100">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Choose M2C MarkDowns
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We're committed to quality, sustainability, and your comfort. Every product is crafted with care and attention to detail.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="text-center"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-lg mb-5">
                <feature.icon className="h-7 w-7 text-[#3d3d3d]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
