import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ArrowRight, Award, Leaf, Ruler, Sun, Wind } from 'lucide-react-native';
import { router } from 'expo-router';
import { Reveal } from '@/components/WebSite/Shared/Reveal';
import { CARD_GUTTER } from '@/components/WebSite/ProductCard/metrics';
import { Fonts } from '@/constants/theme';

/**
 * "The M2C standard" — the five product guarantees above the footer.
 *
 * Ported from frontend/src/components/WebSite/Footer/ValueSection.tsx, which
 * mobile had diverged from in almost every respect:
 *
 *   ground   two-column grid of near-black gradient tiles → the web is a white
 *            section with a warm top rule and no tiles at all
 *   heading  a full SectionHeading ("Our Promise" / "Why Choose M2C
 *            MarkDowns" / a blurb) → the web has NO h2 here, only an eyebrow
 *            reading "The M2C standard"
 *   layout   centred cards → a list: a circular mark on the left, title and
 *            copy on the right
 *   copy     paraphrased → the site's exact strings
 *
 * The web draws its five marks as hand-built SVG (a cotton boll, a struck-
 * through flask, and so on). Those are bespoke artwork rather than an icon set,
 * so this uses the nearest lucide equivalents and keeps the chip, the colours
 * and the layout identical — the shapes differ, the treatment does not.
 */
type Item = { icon: typeof Leaf; title: string; copy: string };

/** Titles and copy verbatim from the web's `labels`. */
const ITEMS: Item[] = [
  { icon: Leaf,  title: '100% Cotton',        copy: 'Pure cotton throughout. Never blended with polyester.' },
  { icon: Award, title: 'OEKO-TEX Certified', copy: 'Independently tested free of harmful substances.' },
  { icon: Wind,  title: 'Breathable Weave',   copy: 'Temperature-regulating, so you stay cool all night.' },
  { icon: Sun,   title: 'Fade-Resistant',     copy: 'Color holds wash after wash, year after year.' },
  { icon: Ruler, title: 'Made for US Sizes',  copy: 'Cut to standard American mattress and pillow sizes.' },
];

const DEEP = '#c41617';

export default function ValueSection() {
  return (
    <View style={s.section}>
      {/* Eyebrow only — the web sets no heading in this section. */}
      <Reveal distance={14} duration={620}>
        <View style={s.eyebrowRow}>
          <View style={s.eyebrowRule} />
          <Text style={s.eyebrow}>The M2C standard</Text>
        </View>
      </Reveal>

      <View style={s.list}>
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          return (
            // 70ms apart — the web's beat: "close enough to read as one
            // movement across the row, far enough apart that you see five
            // things and not a single block fading."
            <Reveal key={item.title} distance={14} duration={620} delay={180 + i * 70}>
              <View style={s.row}>
                <View style={s.chip}>
                  <Icon size={22} color={DEEP} strokeWidth={1.8} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.title}>{item.title}</Text>
                  <Text style={s.copy}>{item.copy}</Text>
                </View>
              </View>
            </Reveal>
          );
        })}
      </View>

      {/* The web keeps its masthead control for desktop and puts this one under
          the list at phone width. */}
      <Reveal distance={14} duration={620} delay={540}>
        <View style={s.ctaRow}>
          <Pressable
            onPress={() => router.push('/(any)/products' as any)}
            accessibilityRole="button"
            accessibilityLabel="Shop the collection"
            style={[s.cta]}
          >
            <Text style={s.ctaText}>Shop the collection</Text>
            <ArrowRight size={16} color="#ffffff" strokeWidth={2.25} />
          </Pressable>
        </View>
      </Reveal>
    </View>
  );
}

const s = StyleSheet.create({
  /* `border-t border-[#efe4d8] bg-white py-10` — a full-bleed white section
     closing the page, with a rule above it and none below (the footer takes
     over from there).

     Inset is CARD_GUTTER, the same 26 the product grids, the category tiles
     and the Best Seller band all use, so the five guarantees line up with
     everything above them instead of sitting 6pt further in. */
  section: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#efe4d8',
    paddingVertical: 40,
    paddingHorizontal: CARD_GUTTER,
  },

  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  eyebrowRule: { height: 1, width: 24, backgroundColor: DEEP },
  eyebrow: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.98, // 0.18em
    color: DEEP,
  },

  list: { gap: 28 }, // gap-y-7
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  /* h-11 w-11 rounded-full border-[#f0dcd6] bg-[#fdf3f0] */
  chip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f0dcd6',
    backgroundColor: '#fdf3f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 14.5,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  copy: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    lineHeight: 21, // leading-relaxed
    color: '#5f5550',
    marginTop: 4,
  },

  ctaRow: { alignItems: 'center', marginTop: 32 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#e01a1b',
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#e01a1b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaPressed: { backgroundColor: DEEP },
  ctaText: {
    fontFamily: Fonts.sansSemibold,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.56, // 0.12em
    color: '#ffffff',
  },
});
