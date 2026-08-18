"use client"

import { values } from '@/components/mockData/aboutContent';
import { CheckCircle } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import AboutBanner from '@/components/WebSite/About/AboutBanner';
import AboutMission from '@/components/WebSite/About/AboutMission';
import AboutVideo from '@/components/WebSite/About/AboutVideo';
import AboutStory from '@/components/WebSite/About/AboutStory';

const About = () => {
  return (
    <div className="bg-white font-sans">
      {/* The banner. Replaces the hero that used to be commented out here —
          the page had no opening statement at all, so the mission block below
          was standing in for one. */}
      <AboutBanner />

      <AboutMission />

      <AboutVideo />

      <AboutStory />

      {/* Values Section */}
      <section className="py-10 sm:py-12 lg:py-16 bg-[#f7f7f5]">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <Reveal className="text-center mb-8 sm:mb-10 lg:mb-12">
            <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-[#e01a1b] mb-3">
              <span className="h-px w-6 bg-[#e01a1b]" />
              What We Stand For
            </span>
            <h2 className="font-playfair text-2xl sm:text-3xl md:text-4xl font-semibold text-[#1a1a1a] tracking-tight mb-3 sm:mb-4">Our Values</h2>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
              These core principles guide everything we do, from selecting artisan partners
              to delivering exceptional products to your doorstep.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {values.map((value, index) => (
              <Reveal key={index} delay={index * 90} className="group text-center p-6 sm:p-7 lg:p-8 rounded-2xl bg-white ring-1 ring-black/5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1.5 hover:ring-[#e01a1b]/20 transition-all duration-500">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#e01a1b] rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-[0_6px_20px_rgba(224,26,27,0.3)] group-hover:scale-110 transition-transform duration-300">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-[#1a1a1a] mb-1 sm:mb-2">{value.title}</h3>
                <p className="text-sm sm:text-base text-gray-600">{value.description}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {/* <section className="py-8 bg-white">
        <div className="max-w-7xl bg-gray-800 p-5 mx-auto px-4 sm:px-6 lg:px-8 text-center rounded-full">
          <h2 className="text-3xl font-bold text-white mb-4">
            Join Our B Too C Journey
          </h2>
          <p className="text-xl text-gray-100 mb-8">
            Every purchase supports traditional artisans and helps preserve cultural heritage for future generations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/products"
              className="bg-white text-gray-800 px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
            >
              Shop Our Collection
            </a>
            <a
              href="/products"
              className="border-2 border-white text-white px-8 py-3 rounded-lg hover:bg-white hover:text-gray-800 transition-colors font-semibold"
            >
              Meet Our Artisans
            </a>
          </div>
        </div>
      </section> */}
    </div>
  );
};

export default About;
