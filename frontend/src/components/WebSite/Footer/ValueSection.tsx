'use client';

import { useEffect, useRef } from 'react';

/**
 * "Read the label" — the brand promise drawn as the thing this shop actually
 * ships: five woven care tags hanging from a rail.
 *
 * This replaced a blush panel of five rainbow gradient orbs. The orbs used
 * red/blue/green/orange/purple — five hues that appear nowhere else on the
 * site — over blue-toned text (#152036) against a warm-red brand. A palette
 * that ignores the brand is what made the section read as generic filler
 * rather than as part of this store.
 *
 * It ran for a while as one material, one ink, one accent — five identical
 * tags differing only by number. That read as monotonous in review, so each tag
 * now carries its own hue through the orb, the header tint, the number, the
 * rule and the footer. The discipline that survived is the palette: five
 * related hues, not five arbitrary ones. See `labels` below.
 *
 * The closing white "trust pill" was dropped — its first item ("Quality
 * Assured / Strict quality checks") repeated PromoStrip's assurance from the
 * top of the same page, and its "10K+ Happy Homes" was an unverified figure.
 *
 * Copy is unchanged from the tightened version: every line is a claim the
 * section already made, with no new specs invented. Replace with real numbers
 * (thread count, GSM, certificate no.) when they're confirmed.
 */
/**
 * A hue per tag, and it runs through the whole card — orb, header tint, number,
 * rule and footer — not just the icon.
 *
 * That distinction is the point. Dropping a coloured disc onto a plain white
 * card gives you a coloured disc on a plain white card; the card is what read
 * as plain. Colouring the object is what makes each of the five visibly its own
 * thing.
 *
 * Five hues, one family: brand red, then plum, olive, gold and clay. Distinct
 * enough that no two cards are mistaken for each other, related enough that
 * they look chosen rather than assigned — which is where the original
 * red/blue/green/orange/purple went wrong. `ink` is the darkened version for
 * type; every one of them clears 4.5:1 on white, and the gold had to be taken
 * from #a5701a (4.2:1) down to #8f6015 to get there.
 */
const labels = [
  { n: '01', kind: 'Fibre',   title: '100% Cotton',        copy: 'Pure cotton throughout. Never blended with polyester.',
    hue: { from: '#ef3b3c', to: '#c81516', ink: '#b81314', tint: '#fdefee' } },
  { n: '02', kind: 'Safety',  title: 'OEKO-TEX Certified', copy: 'Independently tested free of harmful substances.',
    hue: { from: '#9a6386', to: '#70415d', ink: '#70415d', tint: '#f7f0f4' } },
  { n: '03', kind: 'Comfort', title: 'Breathable Weave',   copy: 'Temperature-regulating, so you stay cool all night.',
    hue: { from: '#8b9a52', to: '#66743a', ink: '#5f6d34', tint: '#f4f6ec' } },
  { n: '04', kind: 'Color',   title: 'Fade-Resistant',     copy: 'Color holds wash after wash, year after year.',
    hue: { from: '#dda43a', to: '#b8801f', ink: '#8f6015', tint: '#fdf5e7' } },
  { n: '05', kind: 'Fit',     title: 'Made for US Sizes',  copy: 'Cut to standard American mattress and pillow sizes.',
    hue: { from: '#c9674f', to: '#a8452f', ink: '#a8452f', tint: '#fbf0ec' } },
];

/**
 * The curtain. Every tag runs the SAME sway on the SAME period and differs
 * only in when it starts, which is what turns five hanging cards into one
 * length of cloth with a ripple passing through it. Giving each its own period
 * instead — the first version did, 6.2s / 7.4s / 5.6s / 8.1s / 6.8s — reads as
 * five objects twitching separately, never as one.
 *
 * Direction comes from the sign: a more negative delay is further along, so
 * tag 01 leads and tag 05 trails, and the wave travels left to right. Four
 * steps span half a period, so the row carries half a wave at any moment —
 * one side lifting while the other falls.
 */
const SWAY_PERIOD_S = 4.8;
const SWAY_STEP_S = 0.6;
// toFixed because 3 * 0.6 lands on 1.7999999999999998 and that ends up in the
// rendered markup.
const swayPhase = (i: number, total: number) => `${(-((total - 1 - i) * SWAY_STEP_S)).toFixed(2)}s`;

/**
 * One mark per tag, each drawn for the check it sits on — a cotton boll for
 * fibre, a struck-out flask for harmful substances, a weave cross-section for
 * breathability, sun over cloth for colourfastness, a dimensioned mattress for
 * fit. Drawn as paths rather than taken from an icon library on purpose: a
 * flat icon pack is exactly the look this section was rebuilt to escape, and
 * only purpose-drawn marks can be about these five specific things. That holds
 * even now they sit inside orbs — the orb supplies the colour, the drawing
 * still supplies the meaning.
 */
const ORB_SHADOW = 'inset 0 2px 3px rgba(255,255,255,.32)';

/**
 * The mark, now white line-work on a coloured orb rather than multi-coloured
 * line-work on bare card stock. Every path draws in currentColor, and the orb
 * sets that to white — so one set of paths works on all five hues and the
 * drawing stays specific to its check instead of reverting to a stock icon.
 */
function Orb({ from, to, ink, children }: { from: string; to: string; ink: string; children: React.ReactNode }) {
  return (
    <span
      className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-white"
      style={{
        background: `linear-gradient(150deg, ${from} 0%, ${to} 100%)`,
        boxShadow: `0 13px 22px -11px ${ink}, ${ORB_SHADOW}`,
      }}
    >
      <svg
        aria-hidden
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-8 w-8"
      >
        {children}
      </svg>
    </span>
  );
}

const GLASS = 'rgba(255,255,255,.22)';

const MARKS = [
  // 01 Fibre — a cotton boll: four lobes around a dark seed head.
  <>
    <path
      d="M24 5.5c4.4 0 8 3.4 8 7.6 0 1.3-.3 2.4-.9 3.5 1.1-.6 2.2-.9 3.5-.9 4.2 0 7.6 3.6 7.6 8s-3.4 8-7.6 8c-1.3 0-2.4-.3-3.5-.9.6 1.1.9 2.2.9 3.5 0 4.2-3.6 7.6-8 7.6s-8-3.4-8-7.6c0-1.3.3-2.4.9-3.5-1.1.6-2.2.9-3.5.9-4.2 0-7.6-3.6-7.6-8s3.4-8 7.6-8c1.3 0 2.4.3 3.5.9-.6-1.1-.9-2.2-.9-3.5 0-4.2 3.6-7.6 8-7.6Z"
      fill={GLASS}
      strokeWidth={2.4}
    />
    <circle cx="24" cy="23.7" r="3.6" fill="currentColor" stroke="none" />
  </>,

  // 02 Safety — a laboratory flask struck through: free of harmful substances.
  // Deliberately NOT an OEKO-TEX lookalike; that mark is trademarked.
  <>
    <path
      d="M19.5 7h9v10.8l7.9 15.8A4.4 4.4 0 0 1 32.5 40h-17a4.4 4.4 0 0 1-3.9-6.4l7.9-15.8V7Z"
      fill={GLASS}
      strokeWidth={2.4}
    />
    <path d="M17.5 7h13" strokeWidth={2.4} />
    <circle cx="24" cy="24" r="17.2" strokeWidth={2.9} />
    <path d="M11.8 36.2 36.2 11.8" strokeWidth={2.9} />
  </>,

  // 03 Comfort — a weave in cross-section, weft passing over and under warp,
  // with air moving through it above.
  <>
    <path d="M14 13v24M24 13v24M34 13v24" strokeWidth={2.4} />
    <path d="M7 21q5-6 10 0t10 0 10 0" strokeWidth={2.9} />
    <path d="M7 31q5 6 10 0t10 0 10 0" strokeWidth={2.9} />
    <path d="M8 8c6-3 12 3 18 0s10-2 14-1" strokeWidth={2} />
  </>,

  // 04 Color — sun above a bolt of cloth that keeps its colour under it.
  <>
    <circle cx="24" cy="14" r="6.4" fill={GLASS} strokeWidth={2.4} />
    <path
      d="M24 3.2v3.4M24 21.4v3.4M9.6 14H13M35 14h3.4M16.1 6.1l2.4 2.4M29.5 19.5l2.4 2.4M31.9 6.1l-2.4 2.4M18.5 19.5l-2.4 2.4"
      strokeWidth={2.4}
    />
    <path d="M10 29h28v6.5c-4.7 3.2-9.3-3.2-14 0s-9.3 3.2-14 0Z" fill="currentColor" stroke="none" />
  </>,

  // 05 Fit — a mattress in plan with its hem, dimensioned across the width.
  <>
    <rect x="6" y="12" width="36" height="21" rx="3.5" fill={GLASS} strokeWidth={2.4} />
    <path d="M6 19h36" strokeWidth={2.4} />
    <path d="M8 40h32M11 37l-3 3 3 3M37 37l3 3-3 3" strokeWidth={2.4} />
  </>,
];

/**
 * The rail. All five tags start bunched at the left — pushed together the way
 * clothes sit on a hanger rail — then slide right and settle one per slot.
 *
 * The bunch offset is expressed in percent of the tag's OWN width, so it
 * tracks the card at any container width: one slot is the card plus its
 * gutter, near enough 110% of the card. BUNCH_LEAD pushes the whole pile a
 * little past the first slot so tag 01 has somewhere to travel from too,
 * rather than just fading in where it already is.
 *
 * Durations rise with distance instead of being shared. Tag 05 has four slots
 * to cross and tag 01 has almost none; on one duration the far tag would have
 * to move four times faster and would streak past the near ones. Scaling the
 * time keeps every tag moving at roughly the same speed, which is what makes
 * the row look like objects being pushed apart rather than five independent
 * animations that happen to end together.
 */
const BUNCH_STEP = 110;   // % of card width per slot
const BUNCH_LEAD = 20;    // % — extra so the first tag also travels
const PEEL_MS = 70;       // gap between one tag leaving the bunch and the next
const SLIDE_BASE_MS = 520;
const SLIDE_STEP_MS = 180;

const bunchX = (i: number) => `${-(i * BUNCH_STEP + BUNCH_LEAD)}%`;
const slideMs = (i: number) => SLIDE_BASE_MS + i * SLIDE_STEP_MS;
const peelMs = (i: number) => i * PEEL_MS;
// The tag starts swinging partway through its trip, not on arrival — a hanging
// thing swings while it is being moved and settles after it stops.
const swingDelayMs = (i: number) => peelMs(i) + Math.round(slideMs(i) * 0.45);

export default function ReadTheLabel() {
  const rowRef = useRef<HTMLDivElement>(null);

  /**
   * Own observer rather than the shared <Reveal>. Reveal carries a 1.4s
   * fail-safe timer that calls setVisible(true) unconditionally, so every
   * Reveal on the page flips 1.4 seconds after mount whether it has been
   * scrolled to or not. For a fade nobody notices; for a 1.55s pendulum it
   * meant the tags dropped while still far below the fold and were long
   * settled by the time anyone reached them — the animation ran, just never
   * where it could be seen.
   *
   * Same approach as the flip board: a class on the container, no state,
   * because nothing here needs a re-render and the stagger is CSS delay.
   */
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('m2c-dealt');
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          el.classList.add('m2c-dealt');
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="relative w-full overflow-hidden bg-linear-to-b from-[#f4ece4] via-[#faf5f1] to-white py-14 sm:py-20">
      {/* A woven ground, because this shop sells cloth. Built as a soft
          basket-weave of 18px blocks rather than a hairline crosshatch —
          1px lines at a tight period resample into a coloured haze on HiDPI
          displays, which is exactly what turned the category panel pink.
          Blocks that size have no such artefact at any pixel ratio. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(45deg, rgba(122,15,16,.03) 25%, transparent 25%, transparent 75%, rgba(122,15,16,.03) 75%),' +
            'linear-gradient(45deg, rgba(122,15,16,.03) 25%, transparent 25%, transparent 75%, rgba(122,15,16,.03) 75%)',
          backgroundSize: '18px 18px',
          backgroundPosition: '0 0, 9px 9px',
          // Weave fades out before the section ends so it never meets the next
          // one as a hard edge.
          maskImage: 'linear-gradient(to bottom, #000 0%, #000 52%, transparent 92%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 0%, #000 52%, transparent 92%)',
        }}
      />
      {/* Warmth in the corners, in brand tones only. */}
      <span aria-hidden className="pointer-events-none absolute -left-28 -top-16 h-80 w-80 rounded-full bg-[#e01a1b]/[0.055] blur-3xl" />
      <span aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-[#b8503c]/[0.06] blur-3xl" />
      <style>{`
        /* A tag on a string is a pendulum: it arrives displaced, overswings,
           and loses amplitude each pass until it hangs still. Same physics as
           the flip board's flap — and the same lesson applies, that the easing
           runs between EVERY pair of keyframes, so ease-in-out is what makes
           each pass slow at the ends and quick through the bottom. An ease-out
           here would decelerate into every rebound and turn the swing into a
           slide. */
        @keyframes m2cTagDrop {
          0%   { transform: rotate(-13deg) }
          17%  { transform: rotate(8.5deg) }
          33%  { transform: rotate(-5.4deg) }
          48%  { transform: rotate(3.4deg) }
          62%  { transform: rotate(-2deg) }
          75%  { transform: rotate(1.1deg) }
          87%  { transform: rotate(-0.5deg) }
          100% { transform: rotate(0deg) }
        }
        /* The curtain stroke. At 2.4deg on a 392px tag hinged at the pin the
           bottom edge travels about 16px — plainly visible, while adjacent
           tags stay only ~13px apart at their widest divergence, inside the
           28px gutter, so the row never collides. */
        @keyframes m2cTagSway {
          0%, 100% { transform: rotate(-2.4deg) }
          50%      { transform: rotate(2.4deg) }
        }
        @keyframes m2cTagKick {
          0%   { transform: rotate(0deg) }
          14%  { transform: rotate(7.5deg) }
          32%  { transform: rotate(-5deg) }
          49%  { transform: rotate(3.2deg) }
          65%  { transform: rotate(-1.9deg) }
          80%  { transform: rotate(1deg) }
          92%  { transform: rotate(-0.4deg) }
          100% { transform: rotate(0deg) }
        }

        /* The pin rides along with the tag rather than staying put, which is
           what makes this read as sliding ALONG the rail instead of being
           dropped onto a fixed hook.

           The bunch only applies once the five tags actually share one row.
           Below lg they wrap onto two or three rows, where there is no single
           rail to bunch against and a -456% offset would throw the last tag
           clean off the screen — so small screens get a plain slide in. */
        .m2c-tag {
          opacity: 0;
          transform: translateX(-45%);
          transition: opacity .4s ease, transform .8s cubic-bezier(0.22,1,0.36,1);
        }
        @media (min-width: 1024px) {
          .m2c-tag {
            transform: translateX(var(--bunch, 0%));
            transition-duration: .4s, var(--slide, .8s);
          }
        }
        /* Specificity, not source order, is what lets this beat the rule
           inside the media query. */
        .m2c-dealt .m2c-tag { opacity: 1; transform: translateX(0); }

        /* Two elements, two transforms. One element carrying both would mean
           the infinite sway silently eats the entrance — an animation and a
           transition (or two animations) on one property don't compose. Both
           hinge on the same point: the pin at the top of the string. */
        .m2c-hang { transform-origin: top center; transform: rotate(-13deg); }
        .m2c-dealt .m2c-hang { animation: m2cTagDrop 1.55s ease-in-out both; }
        /* Longhand, not the shorthand. The phase arrives as a custom property
           per tag; writing it as an inline animation-delay instead would
           survive the hover rule below and drag the kick out of time with it. */
        .m2c-sway {
          transform-origin: top center;
          animation-name: m2cTagSway;
          animation-duration: ${SWAY_PERIOD_S}s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
          animation-delay: var(--phase, 0s);
        }

        .m2c-tag:hover .m2c-sway {
          animation-name: m2cTagKick;
          animation-duration: 1.25s;
          animation-timing-function: ease-in-out;
          animation-iteration-count: 1;
          animation-delay: 0s;
        }
        .m2c-tag:hover .m2c-card {
          transform: translateY(-3px);
          box-shadow: 0 18px 34px -22px rgba(60,30,20,.55);
          border-color: #dcccc2;
        }
        .m2c-tag:hover .m2c-rule { width: 3.5rem; }

        @media (prefers-reduced-motion: reduce) {
          .m2c-tag { opacity: 1; transform: none !important; }
          .m2c-hang, .m2c-sway,
          .m2c-tag:hover .m2c-sway { animation: none !important; transform: none !important; }
          .m2c-tag:hover .m2c-card { transform: none; }
        }
      `}</style>

      {/* Eyebrow / heading / subtitle are lifted verbatim from Featured
          Products, Top Selling, Best Seller and Shop by Category so this reads
          as the same site: Playfair semibold on the same size ramp, the red
          dash-and-caps eyebrow, grey subtitle. Left-aligned from lg like the
          rest of them. */}
      <div className="relative mx-auto mb-10 max-w-420 px-3 text-center sm:px-4 sm:mb-14 md:px-6 lg:px-8 lg:text-left">
        <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
          <span className="h-px w-6 bg-[#e01a1b]" />
          The M2C standard
        </span>
        <h2 className="font-playfair mb-2 text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:text-3xl md:mb-3 md:text-4xl xl:text-[2.75rem]">
          Read the label
        </h2>
        <p className="mx-auto max-w-full text-sm leading-relaxed text-gray-500 md:text-base lg:mx-0 lg:max-w-2xl lg:text-lg xl:max-w-3xl">
          Five checks every M2C piece passes before it ships.
        </p>
      </div>

      <div
        ref={rowRef}
        className="relative mx-auto flex max-w-420 flex-wrap justify-center gap-x-5 gap-y-14 px-3 sm:px-4 md:px-6 lg:flex-nowrap lg:gap-x-7 lg:px-8"
      >
        {/* The rail the tags hang from. Desktop only — once the row wraps
            there is no single line for it to be. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-10 top-0 hidden h-px bg-linear-to-r from-transparent via-black/10 to-transparent lg:block"
        />

        {labels.map(({ n, kind, title, copy, hue }, i) => (
          <div
            key={title}
            className="m2c-tag relative basis-[calc(50%-0.625rem)] sm:basis-[calc(33.333%-0.834rem)] lg:basis-0 lg:grow"
            style={
              {
                '--bunch': bunchX(i),
                '--slide': `${slideMs(i)}ms`,
                transitionDelay: `${peelMs(i)}ms`,
                // Front of the rack first: 01 sits on top of the pile and peels
                // away, uncovering 02, and so on. Left in DOM order the pile
                // would be face-05 throughout and empty out from behind.
                zIndex: labels.length - i,
              } as React.CSSProperties
            }
          >
            {/* The pin stays outside the swing — it's the fixed point. */}
            <span
              aria-hidden
              className="absolute left-1/2 top-0 z-10 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1416] ring-2 ring-[#f6f2ee]"
            />

            <div className="m2c-hang" style={{ animationDelay: `${swingDelayMs(i)}ms` }}>
              <div className="m2c-sway" style={{ '--phase': swayPhase(i, labels.length) } as React.CSSProperties}>
                {/* String */}
                <span aria-hidden className="mx-auto block h-9 w-px bg-[#1a1416]/25" />

                {/* Real label anatomy: punched header → stamped body → filed
                    footer. The first pass was a plain white rounded box with
                    the copy floating in the top half, which left ~80px of dead
                    white at the bottom of every card — that void, not the
                    colour or the motion, was what made the row look unfinished.
                    The footer is pinned with mt-auto so the card fills to the
                    same depth whatever the copy length. */}
                <div className="m2c-card relative mx-auto flex min-h-[392px] w-full max-w-[300px] flex-col overflow-hidden rounded-[14px] border border-[#e3d5cb] bg-linear-to-b from-white to-[#fdfaf7] text-center shadow-[0_14px_34px_-24px_rgba(70,38,24,.6)] transition-[transform,box-shadow,border-color] duration-300">
                  {/* Punched header — the reinforced strip a tag is threaded
                      through, and the reason the eyelet reads as an opening
                      rather than a dot floating on white. */}
                  <div className="relative h-[46px] shrink-0 border-b border-[#ece0d8]" style={{ background: hue.tint }}>
                    <span aria-hidden className="absolute left-1/2 top-0 h-[17px] w-px -translate-x-1/2 bg-[#1a1416]/25" />
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-[16px] h-[13px] w-[13px] -translate-x-1/2 rounded-full bg-[#f0e8e1] shadow-[inset_0_1.5px_2px_rgba(70,38,24,.34)] ring-[1.5px] ring-[#d6c6bb]"
                    />
                  </div>

                  {/* Type is sized and weighted to be read at a glance. The
                      first pass set the copy at 14px in #8c7f7d — about 3.6:1
                      on this card, under the 4.5:1 body-text threshold — and
                      the footer at 10px in #a3928c, roughly 2.7:1, which is why
                      it looked switched off rather than quiet. Both are darker
                      now; the palette itself is unchanged. */}
                  <div className="relative flex flex-1 flex-col items-center px-5 pb-4 pt-7">
                    {/* The inner frame every printed label carries. */}
                    <span aria-hidden className="pointer-events-none absolute inset-[7px] rounded-[8px] border border-[#eee2da]" />

                    <span className="relative text-[15px] font-bold tracking-[0.3em]" style={{ color: hue.ink }}>{n}</span>

                    <h3 className="relative mt-4 text-[16px] font-bold uppercase leading-[1.3] tracking-[0.06em] text-[#1a1416] sm:text-[18px]">
                      {title}
                    </h3>

                    <span aria-hidden className="m2c-rule relative mt-4 block h-[2px] w-11 rounded-full transition-[width] duration-300" style={{ background: hue.ink, opacity: 0.75 }} />

                    <p className="relative mt-4 text-[14px] leading-[1.6] text-[#6f625f] sm:text-[15.5px]">{copy}</p>

                    {/* The mark, in the gap the copy left behind. No tinted
                        disc behind it — a coloured circle with a glyph in the
                        middle is the orb this section was built to replace.
                        The mark sits flat on the stock, the way a printed
                        label carries one. */}
                    <span className="relative mt-5 flex items-center justify-center">
                      <Orb from={hue.from} to={hue.to} ink={hue.ink}>{MARKS[i]}</Orb>
                    </span>

                    {/* Filed footer. Each tag names the check it belongs to, so
                        the bottom of the card carries information rather than
                        ornament — and no two footers read the same. */}
                    <span className="relative mt-auto flex w-full items-center justify-center gap-2 border-t border-[#eee2da] pt-4 text-[11.5px] font-bold uppercase tracking-[0.22em]" style={{ color: hue.ink }}>
                      <span aria-hidden className="h-[5px] w-[5px] rotate-45" style={{ background: hue.ink, opacity: 0.8 }} />
                      {kind}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
