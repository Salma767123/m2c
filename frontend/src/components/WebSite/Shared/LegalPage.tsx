'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import Reveal from '@/components/WebSite/Shared/Reveal';
import { pageScroller, scrollPageToTop } from '@/lib/pageScroll';

/**
 * ── Why the icons are elements and not components ─────────────────────────
 *
 * `icon: ReactNode`, written at the call site as `icon={<Scale />}` — not
 * `Icon: LucideIcon` passed as `Icon={Scale}`.
 *
 * This file is a client component and the pages that use it are server
 * components, so everything handed across that boundary has to serialize.
 * A rendered element does; a component function does not, and the build fails
 * outright with "Functions cannot be passed directly to Client Components".
 * The alternative — marking every policy page `'use client'` — would ship each
 * whole document to the browser as JavaScript to work around a constraint that
 * costs nothing to respect.
 *
 * Size and colour still live here, applied to the child svg from the wrapper,
 * so a call site writes the bare icon and cannot get the styling wrong.
 */

/**
 * The three policy pages, so each one can point at the other two.
 *
 * Until now they were reachable from each other only through the footer: a
 * reader on Terms who wanted the refund rule had to scroll to the bottom of the
 * page and hunt. They are one set of documents and should read like one.
 *
 * Paths, not titles, decide which is current — the title prop is the page's own
 * wording and could be edited without anyone thinking about this list.
 */
const POLICIES = [
  { href: '/terms', label: 'Terms of Service' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/returns', label: 'Returns & Exchanges' },
];

export interface LegalSection {
  /** Anchor target and scroll-spy key. Stable — it ends up in the URL. */
  id: string;
  /** Shown as the heading and in the contents list. */
  title: string;
  /** A bare lucide element, e.g. `<FileText />`. Sized and coloured here. */
  icon: ReactNode;
  /** The section's own markup, verbatim. */
  body: ReactNode;
}

interface LegalPageProps {
  /** The large mark above the title. A bare lucide element. */
  icon: ReactNode;
  /** Small ruled caption above the title. */
  eyebrow: string;
  title: string;
  /** The line under the title — a revision date, a promise, whatever the page says. */
  meta: string;
  sections: LegalSection[];
}

/**
 * The shell every policy page renders through — terms, privacy, returns.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * There were three of these pages and they were the same page three times:
 * same grey ground, same white card, same centred icon/eyebrow/title block,
 * same `flex items-center` section headers. Being copies, they had already
 * begun to disagree — Privacy sat at `max-w-[95%]` while Terms and Returns sat
 * at `max-w-7xl`; Returns' headings were `text-gray-900` where Terms' were
 * `text-[#1a1a1a]`; Returns carried a blue callout that existed nowhere else on
 * the site. Three copies means the next fix lands on one of them.
 *
 * ── What this changes about reading them ──────────────────────────────────
 *
 * MEASURE. The card was `max-w-7xl`, which at this site's 91% root font is
 * about 1164px, and the paragraphs ran the whole width of it — roughly 140
 * characters a line. Past about 90 the eye starts losing its place on the
 * return sweep, which is why two plain sentences felt like work. The body is
 * held to ~68ch here; headings still span the card, so the column reads as
 * deliberate rather than as text that failed to fill its box.
 *
 * NAVIGATION. Nobody reads a policy page front to back. They arrive from the
 * checkout wanting one rule — can I return this, do you ship here — and a
 * single undifferentiated scroll makes them hunt for it. Hence a contents list
 * that tracks the section you are in, and numbered sections, which is also how
 * anyone quoting the document back at you will refer to it.
 *
 * ── Two things worth knowing before editing ───────────────────────────────
 *
 * The contents rail is deliberately NOT inside <Reveal>. `.reveal` carries
 * `will-change: opacity, transform`, which opens a stacking context and a
 * containing block that survives `.is-visible` resetting the transform — the
 * same trap that catches absolutely-positioned popovers elsewhere in this
 * codebase. A sticky element has no business being inside it.
 *
 * Anchors land under a sticky header (the bar plus the category rail), so every
 * section carries `scroll-margin-top`. Without it the heading you jumped to is
 * the one thing hidden behind the header.
 */
export default function LegalPage({ icon, eyebrow, title, meta, sections }: LegalPageProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? '');

  /** Whether the phone-sized contents list is expanded. Closed by default. */
  const [listOpen, setListOpen] = useState(false);

  /**
   * The height of the sticky header, measured rather than assumed.
   *
   * Everything that has to sit clear of it is driven from this one number: the
   * anchor offset, the desktop rail's sticky top, and the phone bar's. It used
   * to be a hard-coded 8.5rem, which is 124px here — and the header measures
   * 51px with the category ribbon absent and 131px with it present, so that
   * constant was wrong at both ends: a wasteful gap in one case, and headings
   * landing UNDERNEATH the header in the other.
   */
  const pathname = usePathname();

  const [headH, setHeadH] = useState(0);

  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('div.sticky.top-0.z-50');
      setHeadH(el ? Math.round(el.getBoundingClientRect().height) : 0);
    };
    // Deferred so it does not run in the effect body, and so it reads a laid-out
    // header rather than one still waiting on its web font.
    let frame = requestAnimationFrame(measure);
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /**
   * Set on click and held for the length of the smooth scroll.
   *
   * Without it, jumping from section 1 to section 6 drags the viewport across
   * every section in between, the observer reports each one in turn, and the
   * highlight strobes down the rail before settling. The click already told us
   * the answer; ignore the journey.
   */
  const lockedUntil = useRef(0);

  // A string, not the array. `sections` is rebuilt on every render of the page
  // that owns it, so depending on the array itself would re-run this effect
  // forever; the ids are what the effect actually cares about.
  const sectionKey = sections.map((s) => s.id).join('|');

  /**
   * Which section is "current", worked out from where the sections actually
   * are rather than from what most recently crossed a line.
   *
   * This started as an IntersectionObserver watching a band across the upper
   * third of the viewport, and it reported the wrong section at both ends of
   * the page. Scrolled to the top, no section's box overlaps a band that sits
   * 136px down — the masthead is in the way — so nothing fired and whatever had
   * been highlighted last simply stayed lit. Observers only speak when
   * something crosses; they say nothing about the state you are already in.
   *
   * Reading the positions answers the question directly: the current section is
   * the last one to have passed the reading line, and if none has, it is the
   * first. Both ends are then just clamps — the last section on a page scrolled
   * to the bottom is current even when it is too short to reach the line, which
   * is otherwise a highlight that can never be lit.
   */
  useEffect(() => {
    const ids = sectionKey.split('|').filter(Boolean);
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((n): n is HTMLElement => n !== null);

    if (nodes.length === 0) return;

    // Just below the sticky header stack: a heading is "reached" when it
    // arrives where you would actually be reading it, not when it first
    // appears at the bottom of the screen. Derived from the measured header so
    // the line sits just under it at every breakpoint instead of at a constant
    // that only suits one of them.
    const READING_LINE = headH + 40;

    let frame = 0;

    const recompute = () => {
      frame = 0;
      if (performance.now() < lockedUntil.current) return;

      // Bottom of the page: the last section wins outright, which is what makes
      // a final section too short to reach the reading line reachable at all.
      //
      // Measured on the real scroller — see pageScroller. Every other measurement
      // here is getBoundingClientRect, which is viewport-relative and does not
      // care which element moved.
      const scroller = pageScroller();

      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
        setActiveId(nodes[nodes.length - 1].id);
        return;
      }

      let current = nodes[0].id;
      for (const node of nodes) {
        if (node.getBoundingClientRect().top > READING_LINE) break;
        current = node.id;
      }
      setActiveId(current);
    };

    // Coalesced to one measurement per frame. Reading getBoundingClientRect on
    // every scroll event would force layout far more often than the display
    // can even show a change.
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(recompute);
    };

    // Deferred rather than called outright, so this stays out of the effect
    // body — and it covers arriving on a #hash link, where the browser has
    // already jumped before any scroll event of ours exists to hear.
    frame = requestAnimationFrame(recompute);

    /**
     * On `document`, in the CAPTURE phase — not on `window`.
     *
     * globals.css sets `overflow-x: hidden` on both <html> and <body>, and the
     * overflow spec says that when one axis is not `visible` the other is
     * promoted from `visible` to `auto`. That makes <body> its own scroll
     * container, so the page scrolls INSIDE body rather than at the viewport.
     *
     * Scroll events fire on whichever element actually scrolled and do not
     * bubble; only the document's own scroll event is redirected to window. So
     * a window listener hears nothing here — which is precisely what happened:
     * the rail lit section 01 on mount and stayed there for the whole page.
     *
     * A capture listener on document sees scroll events from any element,
     * including body, and still catches the ordinary document-level one. It
     * costs nothing to be right in both cases rather than to depend on which
     * element the stylesheet happens to have made the scroller.
     */
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('resize', onScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener('scroll', onScroll, { capture: true });
      window.removeEventListener('resize', onScroll);
    };
  }, [sectionKey, headH]);

  /**
   * Where the sliding card sits, in pixels within the list.
   *
   * One element that moves, rather than a background switched on and off per
   * item: a background cannot travel between two items, it can only stop being
   * on one and start being on the other. Height animates alongside the offset
   * because the items are not a uniform height — "How We Use Your Information"
   * wraps to two lines where "Contact Us" does not, and a card that slid at one
   * fixed height would jump on arrival.
   */
  const listRef = useRef<HTMLOListElement>(null);
  const [card, setCard] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const measure = () => {
      const item = list.querySelector<HTMLElement>(`[data-sec="${activeId}"]`);
      if (item) setCard({ top: item.offsetTop, height: item.offsetHeight });
    };

    let frame = requestAnimationFrame(measure);
    // A ResizeObserver rather than a resize listener: the list also changes
    // height when the web font swaps in and a title starts wrapping, which no
    // window event announces.
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    ro.observe(list);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [activeId, sectionKey]);

  const jumpTo = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return; // Let the browser handle it the ordinary way.

    event.preventDefault();
    setActiveId(id);
    lockedUntil.current = performance.now() + 900;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });

    // The URL should carry the section, so the link is worth sending to someone.
    // replaceState rather than a hash assignment, which would re-jump and
    // undo the offset scroll-margin-top just applied.
    window.history.replaceState(null, '', `#${id}`);
  }, []);

  const numberOf = (i: number) => String(i + 1).padStart(2, '0');

  // Clamped to 0: on the first frame, before anything has been measured, an
  // unknown id would otherwise index the phone bar's title to undefined.
  const activeIndex = Math.max(0, sections.findIndex((s) => s.id === activeId));

  return (
    <div
      className="legal-page min-h-screen bg-[#f7f7f5] font-sans"
      style={{ '--legal-head': `${headH}px` } as React.CSSProperties}
    >
      <style>{`
        /* Every anchor target clears the sticky header stack — the bar plus the
           category ribbon — instead of landing beneath it. Driven by the
           measured header rather than a constant, because the category ribbon
           is hidden below the md breakpoint: the stack is ~51px on a phone and
           ~131px on a desktop, and the old flat 8.5rem left headings hidden at
           the wide end while wasting space at the narrow one.
           (No backticks in here — this is a JS template literal.) */
        .legal-section { scroll-margin-top: calc(var(--legal-head, 4rem) + 1.25rem) }

        /* Printed policies are a real thing people do, usually at the moment
           they are about to disagree with one. Give them the document and
           nothing else: no navigation, no shadows, no wasted ink on the card. */
        @media print {
          .legal-page { background: #fff }
          .legal-aside, .legal-toc-mobile { display: none !important }
          .legal-card {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
          .legal-section { break-inside: avoid; page-break-inside: avoid }
        }
      `}</style>

      <div className="mx-auto max-w-[95rem] px-3 py-8 sm:px-4 sm:py-10 md:px-6 lg:px-8 lg:py-12">
        {/* ── Masthead ────────────────────────────────────────────────────
            The same four pieces as before — mark, caption, name, revision line
            — with the caption ruled on both sides rather than one. A single
            rule reads as the beginning of something; a pair reads as a caption,
            which is what it is. Same decision as the category banner. */}
        <Reveal className="mb-8 text-center sm:mb-10">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-b from-[#fdf1ef] to-[#f9e3df] text-[#e01a1b] ring-1 ring-[#f0d5cf] sm:h-16 sm:w-16 [&>svg]:h-7 [&>svg]:w-7 sm:[&>svg]:h-8 sm:[&>svg]:w-8 [&>svg]:[stroke-width:1.6]">
            {icon}
          </span>

          <span className="mb-3 inline-flex items-center gap-3 text-[10.5px] font-semibold uppercase tracking-[0.3em] text-[#c41617] sm:text-[11px]">
            <span aria-hidden className="h-px w-8 bg-[#c41617]/40" />
            {eyebrow}
            <span aria-hidden className="h-px w-8 bg-[#c41617]/40" />
          </span>

          <h1 className="font-playfair text-3xl font-semibold tracking-tight text-balance text-[#1a1a1a] sm:text-4xl lg:text-5xl">
            {title}
          </h1>

          {/* The revision line as a pill rather than loose grey text. It is
              metadata about the document, not part of it, and should not read
              like the first sentence. */}
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[12.5px] font-medium text-[#6b625b] ring-1 ring-black/5 sm:text-[13px]">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#e01a1b]" />
            {meta}
          </p>
        </Reveal>

        {/* ── Contents, small screens ─────────────────────────────────────
            This was a closed <details> saying "Contents · 6 sections", and on a
            phone that is a control almost nobody opens — people scroll a policy
            page, they do not shop a menu of it. So it stops being a menu that
            waits to be asked and becomes a bar that reports: the section you are
            in right now, how far through you are, and a progress line, all
            updating as you scroll. It is still tappable for anyone who does want
            to jump, so nothing is taken away.

            Sticky, and offset by the measured header rather than a guess. */}
        <div
          className="legal-toc-mobile sticky z-20 mb-6 lg:hidden"
          style={{ top: headH + 8 }}
        >
          <div className="overflow-hidden rounded-2xl bg-white/95 shadow-[0_6px_24px_rgba(26,20,22,0.08)] ring-1 ring-black/5 backdrop-blur">
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              aria-expanded={listOpen}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
            >
              <span className="text-[11px] font-semibold tabular-nums text-[#e01a1b]">
                {numberOf(activeIndex)}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-[#1a1a1a]">
                {sections[activeIndex]?.title}
              </span>
              <span className="shrink-0 text-[11.5px] tabular-nums text-[#8a807a]">
                {activeIndex + 1}/{sections.length}
              </span>
              <span
                aria-hidden
                className={`shrink-0 text-[#8a807a] transition-transform duration-200 ${
                  listOpen ? 'rotate-180' : ''
                }`}
              >
                ▾
              </span>
            </button>

            {/* How far through the document you are, at section granularity —
                which is the honest unit here, since that is what the rest of
                this bar is reporting. */}
            <span aria-hidden className="block h-[3px] w-full bg-[#f0ebe4]">
              <span
                className="block h-full rounded-r-full bg-[#e01a1b] transition-[width] duration-500 ease-out"
                style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }}
              />
            </span>

            {listOpen && (
              <ol className="border-t border-[#f0ebe4] px-2 py-2">
                {sections.map((section, i) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(e) => {
                        setListOpen(false);
                        jumpTo(e, section.id);
                      }}
                      aria-current={section.id === activeId ? 'true' : undefined}
                      className={`flex items-baseline gap-3 rounded-lg px-2.5 py-2 text-[13.5px] transition-colors ${
                        section.id === activeId
                          ? 'bg-[#faf7f3] font-semibold text-[#1a1a1a]'
                          : 'text-[#4a423c] hover:bg-[#faf7f3] hover:text-[#1a1a1a]'
                      }`}
                    >
                      <span className="text-[11px] font-semibold tabular-nums text-[#e01a1b]/70">
                        {numberOf(i)}
                      </span>
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>

        {/* No `items-start` here, deliberately. It sets `align-self: start`,
            which shrinks the <aside> to exactly the height of the nav inside
            it — and a sticky element whose containing block is its own height
            has nowhere to travel, so it scrolls away like any other block. The
            default `stretch` gives the aside the full height of the row (the
            document's height), which is the room the rail sticks across. */}
        {/* Two columns from lg, three from xl. The third is held back to xl
            deliberately: at 1024px a third column would squeeze the document to
            about 470px, and the whole point of this layout is that the text
            stays at a readable width. The prose also carries its own max-w-68ch
            inside, so widening the page can never widen the reading line. */}
        <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-x-9 xl:grid-cols-[17rem_minmax(0,1fr)_20rem] xl:gap-x-10">
          {/* ── Contents, large screens ───────────────────────────────────
              Sticky, outside <Reveal> on purpose (see the note above the
              component), and offset to clear the header stack. */}
          <aside className="legal-aside hidden lg:block">
            <nav aria-label="On this page" className="sticky" style={{ top: headH + 24 }}>
              <p className="mb-4 inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#8a807a]">
                <span aria-hidden className="h-px w-5 bg-[#e01a1b]" />
                On this page
              </p>

              <ol ref={listRef} className="relative">
                {/* ── The card that travels ──────────────────────────────
                    One element, moved. The obvious build — give the active
                    item a background and take it off the others — cannot
                    travel: a background can only stop being in one place and
                    start being in another, which reads as a blink rather than
                    as movement. A single positioned card animating its offset
                    and height is the only way the eye follows it from item to
                    item.

                    Rendered only once measured, so it never flashes at the top
                    of the list on the first frame before it knows where to be. */}
                {card && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 rounded-xl bg-white shadow-[0_6px_20px_rgba(26,20,22,0.07)] ring-1 ring-[#efe7dd] transition-[transform,height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
                    style={{ transform: `translateY(${card.top}px)`, height: card.height }}
                  >
                    {/* The one piece of brand colour, riding along on the card's
                        leading edge so the tab reads as pointing at its row. */}
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-[#e01a1b]" />
                  </span>
                )}

                {sections.map((section, i) => {
                  const isActive = section.id === activeId;
                  return (
                    <li key={section.id} data-sec={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => jumpTo(e, section.id)}
                        aria-current={isActive ? 'true' : undefined}
                        className={`relative z-10 flex items-baseline gap-2.5 rounded-xl py-2.5 pl-4 pr-3 text-[13px] leading-snug transition-colors duration-300 ${
                          isActive
                            ? 'font-semibold text-[#1a1a1a]'
                            : 'text-[#7a716a] hover:text-[#1a1a1a]'
                        }`}
                      >
                        <span
                          className={`text-[10.5px] font-semibold tabular-nums transition-colors duration-300 ${
                            isActive ? 'text-[#e01a1b]' : 'text-[#b3a99f]'
                          }`}
                        >
                          {numberOf(i)}
                        </span>
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ol>

              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault();
                  scrollPageToTop();
                }}
                className="mt-5 inline-flex items-center gap-1.5 pl-4 text-[12px] font-medium text-[#8a807a] transition-colors hover:text-[#e01a1b]"
              >
                <span aria-hidden>↑</span> Back to top
              </a>
            </nav>
          </aside>

          {/* ── The document ─────────────────────────────────────────────── */}
          <article className="legal-card rounded-2xl bg-white p-5 shadow-[0_10px_40px_rgba(0,0,0,0.06)] ring-1 ring-black/5 sm:p-7 lg:p-9">
            {sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className="legal-section border-t border-[#efeae3] pt-8 first:border-0 first:pt-0 [&+section]:mt-8"
              >
                {/* The number is set in the margin on wide screens, so the
                    headings line up on their text rather than each starting at
                    a different place depending on how long its number is. */}
                <div className="mb-4 flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fdf1ef] text-[#e01a1b] ring-1 ring-[#f4dcd7] [&>svg]:h-[18px] [&>svg]:w-[18px] [&>svg]:[stroke-width:1.9]">
                    {section.icon}
                  </span>

                  <div className="min-w-0">
                    <span className="block text-[10.5px] font-semibold uppercase tracking-[0.22em] tabular-nums text-[#b3a99f]">
                      Section {numberOf(i)}
                    </span>
                    <h2 className="mt-0.5 font-playfair text-[21px] font-semibold leading-tight tracking-tight text-[#1a1a1a] sm:text-[23px]">
                      {section.title}
                    </h2>
                  </div>
                </div>

                {/* ~78 characters a line.
                    This began at 68ch, which is the comfortable middle of the
                    45-90 band, and moved out to 78 so the page could cover more
                    of a wide screen without leaving slack inside the card — the
                    columns and the reading line had to grow together, or the
                    extra width would simply have become white space to the
                    right of every paragraph. 78 is still well inside the band;
                    the 140-character lines this redesign started from were not.

                    At 95rem the numbers meet: a ~706px document column, less
                    66px of card padding and the 40px indent, leaves ~600px of
                    text — about 76 characters, just under the 78ch ceiling, so
                    the line fills the column and no white space is stranded to
                    the right of it. */}
                <div className="max-w-[78ch] sm:pl-11">{section.body}</div>
              </section>
            ))}
          </article>

          {/* ── The third column ───────────────────────────────────────────
              What used to be blank margin. The three policies are one set of
              documents, and until now the only way from Terms to Privacy was
              the footer — so the space carries the set, plus the way out to a
              human when a document does not answer the question.

              Sticky like the contents rail, offset by the same measured header,
              and outside <Reveal> for the same reason: `.reveal` keeps
              `will-change: transform` after it finishes, which is a containing
              block a sticky element should not be sitting in. */}
          <aside className="legal-aside mt-8 hidden xl:mt-0 xl:block">
            <div className="sticky" style={{ top: headH + 24 }}>
              <p className="mb-4 inline-flex items-center gap-2.5 text-[10.5px] font-semibold uppercase tracking-[0.24em] text-[#8a807a]">
                <span aria-hidden className="h-px w-5 bg-[#e01a1b]" />
                More policies
              </p>

              <ul className="space-y-2">
                {POLICIES.filter((p) => p.href !== pathname).map((policy) => (
                  <li key={policy.href}>
                    <Link
                      href={policy.href}
                      className="group flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-[13px] font-medium text-[#4a423c] ring-1 ring-black/5 transition-colors duration-200 hover:text-[#1a1a1a] hover:ring-[#e6dcd0]"
                    >
                      {policy.label}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#b3a99f] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#e01a1b]" />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* The one thing a policy page cannot do is answer a question it
                  did not anticipate. */}
              <div className="mt-4 rounded-xl border-l-2 border-[#e01a1b] bg-[#faf7f3] px-4 py-3.5 ring-1 ring-black/5">
                <p className="text-[13px] font-semibold text-[#1a1a1a]">Questions?</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[#5a524b]">
                  Our team is here to help, any day of the week.
                </p>
                <Link
                  href="/contact"
                  className="group mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#e01a1b] transition-colors hover:text-[#c41617]"
                >
                  Contact us
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/**
 * A paragraph. One definition of what body copy on a policy page looks like,
 * instead of `text-gray-700` repeated forty times across three files.
 *
 * 15px with relaxed leading: policy text is read slowly and often on a phone,
 * and the 16px/normal default was tight enough to make the long paragraphs
 * look like a wall.
 */
export function LegalText({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`text-[15px] leading-[1.75] text-[#4a423c] ${className}`}>{children}</p>
  );
}

/**
 * A bulleted list.
 *
 * `list-outside`, not the `list-inside` these pages used. Inside puts the
 * marker in the content box, so the second line of a wrapped item returns to
 * the marker's edge and sits under the bullet rather than under the text — the
 * ragged left edge on every multi-line item. Outside hangs the marker in the
 * margin and the text block stays square.
 *
 * The markers are brand red at low opacity: enough to register as part of the
 * design, not enough to pull the eye down the column ahead of the words.
 */
export function LegalList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <ul
      className={`list-outside list-disc space-y-2.5 pl-5 text-[15px] leading-[1.7] text-[#4a423c] marker:text-[#e01a1b]/50 ${className}`}
    >
      {children}
    </ul>
  );
}

/**
 * A callout — the thing a section wants you to leave with.
 *
 * Warm, on the storefront's own palette. What it replaces was
 * `bg-blue-50 border-blue-200 text-blue-800`, the only blue anywhere on this
 * site, which read as a framework default someone had not got round to
 * restyling rather than as emphasis.
 */
export function LegalNote({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border-l-2 border-[#e01a1b] bg-[#faf7f3] px-4 py-3.5 ring-1 ring-black/5 ${className}`}
    >
      {title && <p className="text-[14px] font-semibold text-[#1a1a1a]">{title}</p>}
      <div className={`text-[14px] leading-relaxed text-[#5a524b] ${title ? 'mt-1' : ''}`}>
        {children}
      </div>
    </div>
  );
}
