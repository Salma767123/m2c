'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

/**
 * Our Story in Motion.
 *
 * The video grows to fill the screen as you scroll into it, plays, and shrinks
 * back to its resting size as you scroll past. Scroll position drives the size
 * directly — it is not an entrance that fires once, it tracks the reader both
 * ways.
 *
 * ── How the progress is measured ──────────────────────────────────────────
 *
 * Not with a scroll listener. layout.tsx puts h-full on <html> and <body> and
 * globals.css puts overflow-x: hidden on both, which per the overflow spec
 * forces overflow-y from visible to auto — so <body> is the scroll container
 * and the page scrolls inside it, not on the window. Scroll events do not
 * bubble out of an element, so a window listener never fires at all. Every
 * other scroll handler in this codebase works around it with capture: true.
 *
 * This reads getBoundingClientRect() in a requestAnimationFrame loop instead,
 * which does not care what is scrolling. The loop only runs while the section
 * is on screen — an IntersectionObserver starts and stops it — so it costs
 * nothing for the rest of the page.
 *
 * ── Why width and height, not scale ───────────────────────────────────────
 *
 * The first version scaled a full-viewport stage down to 58%. Transform is
 * cheaper, but it left the layout box at full height while the video drew at
 * 58% of it, so a fifth of the viewport sat empty above the video as a gap
 * under the heading — and scaling a <video> up resamples it soft.
 *
 * The stage is now absolutely positioned and its width and height are
 * interpolated outright. It is one absolutely positioned element, so nothing
 * else on the page relayouts, the resting size is a real size rather than the
 * leftovers of a scale, and the video renders sharp at every step.
 *
 * ── Large screens only ────────────────────────────────────────────────────
 *
 * Below lg it is a normal contained video that plays when it comes into view.
 * A sticky full-height stage depends on a stable viewport height, and mobile
 * browsers change theirs as the URL bar hides — which makes the video jump
 * mid-scroll.
 */

const SRC = '/assets/videos/About1.mp4';

/**
 * Resting size.
 *
 * Driven by viewport HEIGHT first, because that is what decides the gap: the
 * stage is centred in a full-height sticky box, so whatever fraction of the
 * height it does not use shows up as empty space above and below it. At 0.78
 * that leftover is about 90px a side, which reads as ordinary section spacing
 * rather than as a hole. Then capped by width so it cannot overflow a narrow
 * laptop, and by 1152px so it matches the max-w-6xl the rest of the page uses.
 */
const REST_VH = 0.78;
const REST_MAX_W = 1152;
const REST_MAX_VW = 0.92;

/** Below this the phone rules apply. Matches Tailwind's lg. */
const WIDE_AT = 1024;

/**
 * ── Phone only. Nothing below this line affects lg and up. ────────────────
 *
 * The gap under the heading was arithmetic, not styling. The stage is centred
 * in the pinned box, so whatever fraction of that box the video does not fill
 * shows up as empty space above and below it. On desktop the video is sized
 * off the box HEIGHT (REST_VH), which keeps the leftover small. On a phone it
 * was still being sized off WIDTH — 88vw at 16:9 is a thin strip, and centred
 * in a full-height portrait box that left about 270px a side.
 *
 * You cannot have both a full-height box and a landscape video on a portrait
 * screen; one has to give. Cropping the loom to portrait is the worse trade,
 * so the box shrinks instead: 58svh tall, pinned 21svh down, which centres it
 * and keeps it well clear of the sticky header. The resting video then fills
 * two thirds of that, leaving roughly 79px a side instead of 270.
 */
const PIN_VH_NARROW = 58;
const PIN_TOP_NARROW = 21;
const REST_FRACTION_NARROW = 0.66;

/**
 * How tall the section is, in viewport heights.
 *
 * This is the scroll speed control. The stage grows and shrinks across
 * (SECTION_VH - 100) of scrolling, so rest → full takes half that. At 220 it
 * was 60vh — barely more than one flick of a wheel, which is why a light
 * scroll ran the whole thing and threw it straight back. At 320 the same
 * journey takes 110vh and the size stays under the reader's control.
 *
 * Raise it to slow the growth further; nothing else needs changing.
 */
const SECTION_VH = 320;

/** Shorter on a phone — 320 screen-heights is a long way to drag a thumb. */
const MOBILE_SECTION_VH = 230;

/**
 * How hard the size chases the scroll position, per 60fps frame.
 *
 * Without this the size is slaved directly to scroll offset, so every wheel
 * notch and every bit of trackpad momentum arrives as a step change — which
 * is what read as "not smooth". Easing toward the target instead gives the
 * stage a little weight, and smooths the input rather than the output, so it
 * still tracks the scroll exactly where the reader stops.
 *
 * 0.085 settles in roughly 200ms. Higher is snappier and rougher.
 */
const DAMPING = 0.085;

/** Corner radius at rest. Goes to zero as it reaches full bleed. */
const REST_RADIUS = 26;

/** m:ss, and a placeholder while the metadata is still on its way. */
function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Past this much of the way open, the video outranks the site header. */
const IMMERSIVE_AT = 0.55;

/**
 * Plays once this much of the STAGE is on screen — the video box, not the
 * track it scrolls through.
 *
 * This has to be the stage. An IntersectionObserver threshold is a fraction
 * of the observed element, and the track is SECTION_VH tall: at 320vh it can
 * never be more than 100/320 = 31% visible in any viewport, so a threshold
 * above that is simply unreachable and the observer never reports
 * intersecting at all. Watching the track silently stopped the video
 * autoplaying the moment the section grew past ~285vh.
 */
const PLAY_THRESHOLD = 0.4;

/**
 * How early to start buffering, in pixels of scroll.
 *
 * The file is 38MB, so play() on arrival means staring at a black rectangle
 * while it fetches. This starts the download a screen and a half out.
 */
const PRELOAD_MARGIN = '900px 0px';

export default function AboutVideo() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const pinRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  /** How far the browser has downloaded. Worth showing on a 38MB file. */
  const [buffered, setBuffered] = useState(0);

  const barRef = useRef<HTMLDivElement | null>(null);
  const scrubbing = useRef(false);

  // ── Size tracks scroll ──────────────────────────────────────────────────
  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const stage = stageRef.current;
    if (!section || !pin || !stage) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let running = false;
    /** The value actually on screen, chasing the target set by scroll. */
    let smooth = 0;
    let last = 0;
    /**
     * The pinned box's sticky offset, in px. Zero on desktop, so the progress
     * maths below is unchanged there — on a phone the box pins partway down
     * the screen, and without this the stage would stop short of full.
     * Cached rather than read per frame: getComputedStyle forces a style
     * recalc, which is the last thing a 60fps loop needs.
     */
    let pinTop = 0;
    const measurePin = () => {
      pinTop = parseFloat(window.getComputedStyle(pin).top) || 0;
    };

    const apply = (eased: number) => {
      const vw = window.innerWidth;
      // The pinned box is sized in svh, so measure against it rather than
      // innerHeight — on a phone those differ by the height of the URL bar,
      // and using the wrong one leaves the video short of the box it sits in.
      const vh = pin.clientHeight || window.innerHeight;
      const isWide = vw >= WIDE_AT;

      // Desktop is unchanged: width-led, capped by the box height.
      // Phone is height-led off the (now shorter) box, so the leftover space
      // above and below stays small. See the phone-only note above.
      const restW = isWide
        ? Math.min(REST_MAX_W, vw * REST_MAX_VW, vh * REST_VH * (16 / 9))
        : Math.min(vw * REST_MAX_VW, vh * REST_FRACTION_NARROW * (16 / 9));
      const restH = isWide ? restW * (9 / 16) : vh * REST_FRACTION_NARROW;

      const fullW = vw;
      const fullH = vh;

      stage.style.setProperty('--w', `${(restW + (fullW - restW) * eased).toFixed(1)}px`);
      stage.style.setProperty('--h', `${(restH + (fullH - restH) * eased).toFixed(1)}px`);
      stage.style.setProperty('--r', `${(REST_RADIUS * (1 - eased)).toFixed(1)}px`);
      stage.style.setProperty('--k', eased.toFixed(3));

      // Above the header's z-50 once it is most of the way open, so the
      // navbar disappears behind the video instead of sitting on top of it —
      // and comes back on its own as the video shrinks. Nothing in the shared
      // Header component has to know this section exists.
      pin.classList.toggle('is-immersive', eased > IMMERSIVE_AT);
    };

    const frame = (now?: number) => {
      const t = now ?? 0;
      // Clamped, so returning to a backgrounded tab does not jump the size in
      // one enormous step.
      const dt = last && t ? Math.min(64, t - last) : 16.67;
      last = t;

      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, rect.height - (pin.clientHeight || window.innerHeight));
      // pinTop is 0 on desktop, so this is the same expression it always was.
      const p = Math.min(1, Math.max(0, (pinTop - rect.top) / travel));
      // Peaks in the middle of the range: small, full, small.
      const k = 1 - Math.abs(p * 2 - 1);
      // Smoothstep, so it eases at both ends instead of turning a corner.
      const target = k * k * (3 - 2 * k);

      // Exponential ease toward the target, converted for the real frame
      // interval so it behaves the same on a 60Hz and a 120Hz display —
      // otherwise the effect is literally twice as fast on a good monitor.
      const rate = 1 - Math.pow(1 - DAMPING, dt / 16.67);
      smooth += (target - smooth) * rate;
      // Snap the last hundredth, so it settles rather than creeping forever.
      if (Math.abs(target - smooth) < 0.001) smooth = target;

      apply(smooth);
      if (running) raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      apply(0);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !running) {
            running = true;
            // Reset the clock, or the first dt is the whole time since the
            // section was last on screen.
            last = 0;
            raf = requestAnimationFrame(frame);
          } else if (!entry.isIntersecting && running) {
            running = false;
            cancelAnimationFrame(raf);
            // Leaving with the class still on would strand the header behind
            // a video that is no longer on screen.
            pin.classList.remove('is-immersive');
          }
        }
      },
      { threshold: 0 }
    );

    io.observe(section);
    // One pass up front, and again on resize, so the stage is the right size
    // before any scrolling and after the window changes.
    measurePin();
    frame();
    // Wrapped: addEventListener would hand frame() the Event as its timestamp.
    const onResize = () => {
      measurePin();
      frame();
    };
    window.addEventListener('resize', onResize);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', onResize);
      pin.classList.remove('is-immersive');
    };
  }, []);

  // ── Plays when it arrives, pauses when it leaves ────────────────────────
  //
  // preload is "none" in the markup so the file is not fetched on page load.
  // It is raised to "auto" here, on approach, and only then does the download
  // start. That matters more than usual: the file is 38MB.
  useEffect(() => {
    const stage = stageRef.current;
    const video = videoRef.current;
    if (!stage || !video) return;

    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Set as a property, not just left to the JSX attribute. React does not
    // reliably render `muted` into the server HTML, so the element can reach
    // the browser unmuted — and an unmuted video is refused autoplay outright
    // by every current browser. One line, and it is the difference between
    // autoplay working and silently doing nothing.
    video.muted = true;

    // Start fetching before the reader gets here, so play() has something to
    // play. Fires once — load() restarts the resource selection algorithm,
    // which with preload="none" is what actually kicks off the download.
    let warmed = false;
    const warm = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !warmed) {
            warmed = true;
            video.preload = 'auto';
            video.load();
            warm.disconnect();
          }
        }
      },
      { rootMargin: PRELOAD_MARGIN, threshold: 0 }
    );

    const play = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!reduced) {
              // Rejects when the browser blocks autoplay anyway; the play
              // button is right there, so there is nothing to recover from.
              video.play().catch(() => {});
            }
          } else {
            video.pause();
          }
        }
      },
      { threshold: PLAY_THRESHOLD }
    );

    warm.observe(stage);
    play.observe(stage);
    return () => {
      warm.disconnect();
      play.disconnect();
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // ── Scrubbing ───────────────────────────────────────────────────────────
  const seekToClientX = (clientX: number) => {
    const bar = barRef.current;
    const video = videoRef.current;
    if (!bar || !video || !video.duration || !Number.isFinite(video.duration)) return;
    const rect = bar.getBoundingClientRect();
    const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    video.currentTime = fraction * video.duration;
    setCurrent(video.currentTime);
  };

  const onScrubDown = (e: React.PointerEvent) => {
    scrubbing.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    seekToClientX(e.clientX);
  };

  const onScrubMove = (e: React.PointerEvent) => {
    if (!scrubbing.current) return;
    seekToClientX(e.clientX);
  };

  const onScrubUp = (e: React.PointerEvent) => {
    if (!scrubbing.current) return;
    scrubbing.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  /** Nudge with the keyboard, so the bar is not mouse-only. */
  const onScrubKey = (e: React.KeyboardEvent) => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlay();
    }
  };

  const played = duration > 0 ? (current / duration) * 100 : 0;
  const loaded = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <section className="relative bg-[#f7f7f5] font-sans">
      <style>{`
        /* Colour arrives with the screen. The stills on this page are
           grayscale, and a grayscale video filling the whole viewport is a
           large grey rectangle — the footage is the one place on /about where
           the cloth should be in colour, and full bleed is the moment for it.
           --k is the same eased progress that drives the size. */
        .av-film {
          filter: grayscale(calc(1 - var(--k, 0)));
          transition: filter .2s linear;
        }

        /* svh, not vh. The *small* viewport height is measured with the
           browser chrome visible, so it does not change when a phone's URL
           bar hides — which is the whole reason this effect used to be
           desktop-only. With svh the pinned box holds still and the video
           stops jumping mid-scroll. */
        .av-pin {
          position: sticky;
          top: 0;
          height: 100svh;
          overflow: hidden;
          /* The pinned box spans the whole viewport, so it would swallow
             clicks meant for anything underneath — including the header it is
             about to cover. Only the stage itself takes pointer events. */
          pointer-events: none;
        }
        .av-stage {
          position: absolute;
          left: 50%;
          top: 50%;
          width: var(--w);
          height: var(--h);
          transform: translate(-50%, -50%);
          border-radius: var(--r, ${REST_RADIUS}px);
          pointer-events: auto;
          /* The stage resizes every frame. Containment tells the browser that
             work cannot affect anything outside it, so the rest of the page is
             not re-laid out sixty times a second. */
          contain: layout paint;
        }
        /* Above the site header's z-50. */
        .av-pin.is-immersive { z-index: 60 }

        /* Set here rather than as a Tailwind class so the scroll distance has
           one source of truth — Tailwind's scanner cannot see a value built
           from a constant. Shorter on a phone: 320 screen-heights of scrolling
           for one video is a long way to drag a thumb. */
        .av-track { height: ${MOBILE_SECTION_VH}svh }
        @media (min-width: ${WIDE_AT}px) {
          .av-track { height: ${SECTION_VH}svh }
        }

        /* ── Phone only ────────────────────────────────────────────────────
           A shorter pinned box, sitting lower. This is the gap fix — see the
           note on PIN_VH_NARROW. Scoped to max-width so the desktop rules
           above are untouched. */
        @media (max-width: ${WIDE_AT - 0.02}px) {
          .av-pin {
            top: ${PIN_TOP_NARROW}svh;
            height: ${PIN_VH_NARROW}svh;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .av-film { filter: none }
        }
      `}</style>

      {/* ── Masthead ───────────────────────────────────────────────────────
          No bottom padding from lg: the stage is centred in a full-height
          pinned box, and the space that leaves above it is already the gap. */}
      <div className="mx-auto max-w-6xl px-3 pb-6 pt-10 text-center sm:px-4 sm:pt-12 md:px-6 lg:px-8 lg:pb-0 lg:pt-16">
        <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#e01a1b] sm:text-xs">
          <span aria-hidden className="h-px w-6 bg-[#e01a1b]" />
          Watch the craft
        </span>
        <h2 className="mb-3 font-playfair text-2xl font-semibold tracking-tight text-[#1a1a1a] sm:mb-4 sm:text-3xl md:text-4xl">
          Our Story in Motion
        </h2>
        <p className="mx-auto max-w-3xl text-sm text-[#5f5550] sm:text-base lg:text-lg">
          Discover the passion, craftsmanship, and dedication that drives our mission to bring
          authentic handcrafted textiles from traditional artisans to your home.
        </p>
      </div>

      {/* ── The tall section ───────────────────────────────────────────────
          Its extra height is the scroll distance the stage grows and shrinks
          over. Below lg it collapses and the video sits normally. */}
      <div ref={sectionRef} className="av-track relative">
        <div ref={pinRef} className="av-pin">
          <div
            ref={stageRef}
            className="av-stage group overflow-hidden bg-linear-to-br from-[#2a0709] to-[#12060a] shadow-[0_30px_70px_-40px_rgba(0,0,0,0.8)]"
          >
            <video
              ref={videoRef}
              className="av-film h-full w-full object-cover"
              muted
              loop
              playsInline
              // Not "metadata": that still reaches for the file on page load,
              // and this one is 38MB. The observer above raises it to "auto"
              // when the reader is actually approaching the section.
              preload="none"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration)}
              // Fires roughly four times a second, which is the browser's own
              // throttle — cheap enough to drive the bar from directly.
              onTimeUpdate={(e) => {
                if (!scrubbing.current) setCurrent(e.currentTarget.currentTime);
              }}
              onProgress={(e) => {
                const v = e.currentTarget;
                if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
              }}
            >
              <source src={SRC} type="video/mp4" />
              <p className="p-8 text-center text-white">
                Your browser does not support the video tag.{' '}
                <a href={SRC} className="ml-2 underline">
                  Download the video instead
                </a>
              </p>
            </video>

            {/* Click anywhere on the picture to play or pause. Sits under the
                control bar in the DOM, so the bar's own hit area wins. */}
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause video' : 'Play video'}
              className="absolute inset-0 grid place-items-center focus:outline-none"
            >
              {/* Only while paused. It used to reappear on hover during
                  playback, which put two pause buttons on screen at once
                  alongside the one in the bar. */}
              <span
                className={`grid h-16 w-16 place-items-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-opacity duration-300 sm:h-20 sm:w-20 ${isPlaying ? 'opacity-0' : 'opacity-100'
                  }`}
              >
                <Play className="ml-1 h-7 w-7 sm:h-8 sm:w-8" />
              </span>
            </button>

            {/* ── Control bar ──────────────────────────────────────────────
                Always up while paused, and on hover while playing — so a
                video that is quietly looping in the background is not carrying
                a permanent slab of chrome across the bottom of the picture.

                The old version had no scrubber at all, only a mute toggle. */}
            <div
              className={`absolute inset-x-0 bottom-0 px-4 pb-3 pt-10 transition-opacity duration-300 sm:px-6 sm:pb-5 ${isPlaying ? 'opacity-0 group-hover:opacity-100 focus-within:opacity-100' : 'opacity-100'
                }`}
              style={{
                background:
                  'linear-gradient(to top, rgba(10,6,5,.72) 0%, rgba(10,6,5,.34) 48%, rgba(10,6,5,0) 100%)',
              }}
            >
              {/* Scrubber. Hit area is 16px tall so it is grabbable, while
                  the visible track stays a 4px hairline. */}
              <div
                ref={barRef}
                role="slider"
                tabIndex={0}
                aria-label="Seek"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration) || 0}
                aria-valuenow={Math.round(current)}
                aria-valuetext={`${clock(current)} of ${clock(duration)}`}
                onPointerDown={onScrubDown}
                onPointerMove={onScrubMove}
                onPointerUp={onScrubUp}
                onPointerCancel={onScrubUp}
                onKeyDown={onScrubKey}
                className="group/bar relative flex h-4 cursor-pointer touch-none items-center focus:outline-none"
              >
                <span aria-hidden className="absolute inset-x-0 h-1 rounded-full bg-white/25" />
                {/* Downloaded so far — on a 38MB file this is the difference
                    between "stuck" and "still loading". */}
                <span
                  aria-hidden
                  className="absolute left-0 h-1 rounded-full bg-white/35 transition-[width] duration-300"
                  style={{ width: `${loaded}%` }}
                />
                <span
                  aria-hidden
                  className="absolute left-0 h-1 rounded-full bg-[#e01a1b]"
                  style={{ width: `${played}%` }}
                />
                <span
                  aria-hidden
                  className="absolute h-3 w-3 -translate-x-1/2 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.5)] transition-transform duration-200 group-hover/bar:scale-125 group-focus/bar:scale-125"
                  style={{ left: `${played}%` }}
                />
              </div>

              <div className="mt-2 flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause video' : 'Play video'}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition-colors duration-200 hover:bg-white/15"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>

                <span className="shrink-0 text-[12px] tabular-nums text-white/85">
                  {clock(current)} <span className="text-white/45">/ {clock(duration)}</span>
                </span>

                <button
                  onClick={toggleMute}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                  className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-white transition-colors duration-200 hover:bg-white/15"
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
