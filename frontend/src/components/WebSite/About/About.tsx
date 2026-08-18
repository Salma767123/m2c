"use client"

import { values } from '@/components/mockData/aboutContent';
import { BadgeCheck, Award, Leaf, Landmark, Users } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import AboutBanner from '@/components/WebSite/About/AboutBanner';
import AboutMission from '@/components/WebSite/About/AboutMission';
import AboutVideo from '@/components/WebSite/About/AboutVideo';
import AboutStory from '@/components/WebSite/About/AboutStory';

/**
 * One icon per value, and a different one each time.
 *
 * The section used to repeat the same CheckCircle five times, which is
 * decoration rather than information — the eye landed on five identical red
 * discs instead of on the five different words. These distinguish.
 *
 * Keyed off the title so aboutContent stays pure copy with no presentation in
 * it. Anything unmapped falls back rather than rendering a hole.
 */
const VALUE_ICONS: Record<string, typeof BadgeCheck> = {
  Authenticity: BadgeCheck,
  Quality: Award,
  Sustainability: Leaf,
  Heritage: Landmark,
  Community: Users,
};

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

      {/* ── Our Values ─────────────────────────────────────────────────────
          A trust band, which is the ecommerce idiom for this — icon, short
          label, one line — not the type-only editorial treatment it briefly
          had. Shoppers read this pattern without thinking about it.

          What was actually wrong with the original, all of it fixed here
          rather than thrown out with the icons:

           · The same CheckCircle on all five cards. One icon repeated is
             decoration, not information, and as a filled brand-red disc with
             a glow it outshouted the words it was labelling. Five distinct
             icons now, in an outline weight inside a soft rose disc.

           · Five items in a three-column grid is 3 + 2 with a framed hole in
             the last row. flex-wrap with justify-center means an incomplete
             final row centres itself instead — it reads as deliberate at
             every breakpoint.

           · #f7f7f5 and text-gray-600 are cool greys, on a page that is warm
             linen and oxblood everywhere else.

           · The cards were large enough to be the section. A trust band is
             supporting information; these are compact.

          The ground is white and the cards carry the tint, which is the
          reverse of everywhere else on this page. Two reasons. White cards on
          an off-white band barely separated — they were the same surface with
          a line drawn round them. And AboutStory directly above is #faf6f0,
          so an off-white band here merged straight into it; white gives the
          two sections a clean break with no divider needed.

          On hover a card rises AND brightens to white, so the lift is a
          change of surface rather than just a shadow. */}
      <section className="border-y border-[#f2e9df] bg-white py-12 font-sans sm:py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto mb-8 max-w-2xl text-center sm:mb-10 lg:mb-12">
            {/* #c41617 rather than brand #e01a1b: at 11px bold on this ground
                the brand red measures 4.3:1, this reads the same and makes
                5.1:1. */}
            <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c41617] sm:text-xs">
              <span aria-hidden className="h-px w-6 bg-[#c41617]" />
              What we stand for
            </span>
            <h2 className="mb-3 font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:mb-4 sm:text-3xl md:text-4xl">
              Our Values
            </h2>
            <p className="text-sm leading-relaxed text-[#5f5550] sm:text-base lg:text-lg">
              These core principles guide everything we do, from selecting artisan
              partners to delivering exceptional products to your doorstep.
            </p>
          </Reveal>

          {/* flex-wrap, not grid. With five items there is no column count
              that divides evenly at every breakpoint, and a grid leaves the
              gap on the left where it looks like a missing card. Wrapping and
              centring puts the short row in the middle, where it looks
              intended. Widths subtract their share of the gap so the rows sit
              flush. */}
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
            {values.map((value, index) => {
              const Icon = VALUE_ICONS[value.title] ?? BadgeCheck;
              return (
                <Reveal
                  key={value.title}
                  delay={index * 90}
                  className="w-full sm:w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(20%-0.8rem)]"
                >
                  <div className="group h-full rounded-xl border border-[#efe4d8] bg-[#faf7f3] p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-[#e8d2cb] hover:bg-white hover:shadow-[0_18px_38px_-24px_rgba(74,50,38,0.55)]">
                    {/* Outline icon in a soft rose disc, not white-on-solid-red
                        with a glow. It labels the value; it should not be
                        louder than it. */}
                    <span
                      aria-hidden
                      className="mx-auto mb-3.5 grid h-11 w-11 place-items-center rounded-full bg-[#fdf3f0] text-[#c41617] transition-colors duration-300 group-hover:bg-[#c41617] group-hover:text-white"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="text-[15px] font-semibold text-[#1a1a1a] sm:text-base">
                      {value.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#5f5550]">
                      {value.description}
                    </p>
                  </div>
                </Reveal>
              );
            })}
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
