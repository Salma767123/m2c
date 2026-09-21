'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Sparkles } from 'lucide-react'

/**
 * A celebratory popup for AUTOMATIC offers (not coupons — that popup lives in the
 * cart). Two flavours:
 *   - 'bogo'    → a gift-box "freebie unlocked" card (Buy X Get Y).
 *   - 'savings' → a gold-coin "you saved ₹X" card (any % / flat / quantity offer).
 * Both throw a colourful confetti burst layered with twinkling sparkles and a
 * rising particle field, and name the exact offer that was applied. Rendered
 * through a portal so it escapes any sticky/isolated stacking context on the host
 * page, and reused by both the cart and the checkout page. Auto-dismisses after a
 * few seconds (a progress bar counts it down), or on click / Escape.
 */

export interface OfferCelebrationProps {
  open: boolean
  onClose: () => void
  variant: 'bogo' | 'savings'
  /** bogo: how many units are free right now (e.g. 1). */
  freeUnits?: number
  /** bogo: the deal in words, e.g. "Buy 2 Get 1 Free". */
  dealLabel?: string
  /** savings: preformatted amount, e.g. "₹124.00". */
  amountLabel?: string
  /** The applied offer's name, e.g. "Diwali Big Save". */
  offerTitle?: string
  /** The applied offer's description / fine print. */
  offerDescription?: string
  /** Auto-dismiss delay in ms (0 disables). Default 6000. */
  autoCloseMs?: number
}

// Deterministic confetti (no Math.random at render — the repo forbids impure calls
// during render). A ring of festive pieces thrown up and out from the icon.
const CONFETTI = [
  { tx: -150, ty: -40, r: -200, d: 0, c: '#e01a1b', w: 8, h: 14, round: false },
  { tx: -120, ty: -120, r: 120, d: 40, c: '#f5b301', w: 9, h: 9, round: true },
  { tx: -80, ty: -170, r: -60, d: 80, c: '#1a8c53', w: 7, h: 15, round: false },
  { tx: -30, ty: -195, r: 200, d: 20, c: '#3b82f6', w: 9, h: 9, round: true },
  { tx: 30, ty: -200, r: -140, d: 60, c: '#a855f7', w: 8, h: 14, round: false },
  { tx: 85, ty: -175, r: 90, d: 100, c: '#e01a1b', w: 9, h: 9, round: true },
  { tx: 128, ty: -125, r: -30, d: 30, c: '#f5b301', w: 7, h: 15, round: false },
  { tx: 158, ty: -50, r: 260, d: 70, c: '#1a8c53', w: 9, h: 9, round: true },
  { tx: 168, ty: 30, r: -100, d: 110, c: '#3b82f6', w: 8, h: 14, round: false },
  { tx: -168, ty: 30, r: 160, d: 50, c: '#a855f7', w: 9, h: 9, round: true },
  { tx: -158, ty: 100, r: -220, d: 90, c: '#e01a1b', w: 7, h: 15, round: false },
  { tx: 150, ty: 105, r: 40, d: 10, c: '#f5b301', w: 9, h: 9, round: true },
  { tx: -100, ty: 150, r: -80, d: 120, c: '#1a8c53', w: 8, h: 14, round: false },
  { tx: 100, ty: 155, r: 300, d: 45, c: '#3b82f6', w: 9, h: 9, round: true },
  { tx: -40, ty: 180, r: -160, d: 85, c: '#a855f7', w: 7, h: 15, round: false },
  { tx: 45, ty: 185, r: 60, d: 25, c: '#e01a1b', w: 9, h: 9, round: true },
  { tx: 0, ty: 205, r: 180, d: 130, c: '#f5b301', w: 8, h: 14, round: false },
  { tx: -200, ty: -20, r: -120, d: 65, c: '#1a8c53', w: 9, h: 9, round: true },
  { tx: 200, ty: -15, r: 220, d: 35, c: '#a855f7', w: 7, h: 15, round: false },
  { tx: 60, ty: -130, r: -40, d: 95, c: '#3b82f6', w: 9, h: 9, round: true },
  { tx: -60, ty: -140, r: 140, d: 15, c: '#e01a1b', w: 8, h: 14, round: false },
  { tx: 120, ty: 60, r: -260, d: 75, c: '#f5b301', w: 9, h: 9, round: true },
  { tx: -120, ty: 55, r: 100, d: 55, c: '#1a8c53', w: 7, h: 15, round: false },
  { tx: 20, ty: -160, r: -180, d: 105, c: '#a855f7', w: 9, h: 9, round: true },
] as const

// Twinkling sparkle stars scattered around the icon — a second, softer layer over
// the confetti. Each fades in and pulses on its own delay so they shimmer.
const SPARKLES = [
  { x: -140, y: -70, s: 18, d: 120 },
  { x: 150, y: -80, s: 22, d: 380 },
  { x: -170, y: 40, s: 14, d: 640 },
  { x: 175, y: 55, s: 16, d: 260 },
  { x: -90, y: -140, s: 13, d: 520 },
  { x: 95, y: -150, s: 20, d: 80 },
  { x: 0, y: -180, s: 15, d: 700 },
  { x: -60, y: 150, s: 17, d: 440 },
  { x: 70, y: 155, s: 14, d: 200 },
  { x: 130, y: 130, s: 12, d: 600 },
] as const

// Fine particle field — tiny dots that drift upward and dissolve, a continuous
// ambient sparkle behind the burst. Positions/velocities are hand-picked.
const PARTICLES = [
  { x: -110, y: 60, tx: -20, dur: 2600, d: 0, c: '#f5b301', sz: 4 },
  { x: 120, y: 80, tx: 24, dur: 3000, d: 300, c: '#e01a1b', sz: 3 },
  { x: -70, y: 120, tx: -10, dur: 2400, d: 600, c: '#3b82f6', sz: 4 },
  { x: 60, y: 130, tx: 16, dur: 2800, d: 150, c: '#1a8c53', sz: 3 },
  { x: -150, y: 20, tx: -26, dur: 3200, d: 450, c: '#a855f7', sz: 5 },
  { x: 150, y: 10, tx: 28, dur: 2600, d: 900, c: '#f5b301', sz: 4 },
  { x: 20, y: 150, tx: 6, dur: 3000, d: 250, c: '#e01a1b', sz: 3 },
  { x: -30, y: 160, tx: -8, dur: 2700, d: 750, c: '#3b82f6', sz: 4 },
  { x: 95, y: 120, tx: 20, dur: 3100, d: 520, c: '#a855f7', sz: 3 },
  { x: -95, y: 100, tx: -18, dur: 2500, d: 1000, c: '#1a8c53', sz: 5 },
] as const

// Full-page confetti rain — pieces fall from above the viewport across the whole
// width, swaying and spinning as they drop. Deterministic (no Math.random at render).
// `x` is a left % ; `sway` is horizontal drift px ; `spin` end rotation ; `dur`/`d` ms.
const RAIN = [
  { x: 3, c: '#e01a1b', w: 8, h: 14, round: false, sway: 40, spin: 320, dur: 3200, d: 0 },
  { x: 9, c: '#f5b301', w: 9, h: 9, round: true, sway: -30, spin: -200, dur: 3800, d: 400 },
  { x: 15, c: '#1a8c53', w: 7, h: 15, round: false, sway: 55, spin: 260, dur: 3000, d: 900 },
  { x: 21, c: '#3b82f6', w: 9, h: 9, round: true, sway: -45, spin: 180, dur: 3600, d: 200 },
  { x: 27, c: '#a855f7', w: 8, h: 14, round: false, sway: 35, spin: -300, dur: 4000, d: 1200 },
  { x: 33, c: '#e01a1b', w: 9, h: 9, round: true, sway: -50, spin: 240, dur: 3300, d: 600 },
  { x: 39, c: '#f5b301', w: 7, h: 15, round: false, sway: 48, spin: -160, dur: 3900, d: 100 },
  { x: 45, c: '#1a8c53', w: 9, h: 9, round: true, sway: -38, spin: 300, dur: 3100, d: 1400 },
  { x: 51, c: '#3b82f6', w: 8, h: 14, round: false, sway: 52, spin: -220, dur: 3700, d: 300 },
  { x: 57, c: '#a855f7', w: 9, h: 9, round: true, sway: -42, spin: 200, dur: 3400, d: 1000 },
  { x: 63, c: '#e01a1b', w: 7, h: 15, round: false, sway: 44, spin: -280, dur: 4100, d: 500 },
  { x: 69, c: '#f5b301', w: 9, h: 9, round: true, sway: -34, spin: 260, dur: 3000, d: 1600 },
  { x: 75, c: '#1a8c53', w: 8, h: 14, round: false, sway: 50, spin: -180, dur: 3800, d: 150 },
  { x: 81, c: '#3b82f6', w: 9, h: 9, round: true, sway: -48, spin: 320, dur: 3500, d: 800 },
  { x: 87, c: '#a855f7', w: 7, h: 15, round: false, sway: 38, spin: -240, dur: 3200, d: 1100 },
  { x: 93, c: '#e01a1b', w: 9, h: 9, round: true, sway: -40, spin: 200, dur: 3900, d: 350 },
  { x: 97, c: '#f5b301', w: 8, h: 14, round: false, sway: 30, spin: -300, dur: 3300, d: 1300 },
  { x: 6, c: '#3b82f6', w: 6, h: 6, round: true, sway: 26, spin: 160, dur: 4200, d: 1800 },
  { x: 18, c: '#a855f7', w: 8, h: 13, round: false, sway: -46, spin: 280, dur: 3600, d: 2000 },
  { x: 30, c: '#1a8c53', w: 7, h: 7, round: true, sway: 42, spin: -220, dur: 3400, d: 1700 },
  { x: 42, c: '#e01a1b', w: 8, h: 14, round: false, sway: -36, spin: 300, dur: 3900, d: 2200 },
  { x: 54, c: '#f5b301', w: 7, h: 7, round: true, sway: 50, spin: -180, dur: 3100, d: 1900 },
  { x: 66, c: '#3b82f6', w: 8, h: 13, round: false, sway: -44, spin: 240, dur: 3700, d: 2400 },
  { x: 78, c: '#a855f7', w: 7, h: 7, round: true, sway: 34, spin: -260, dur: 3300, d: 2100 },
  { x: 90, c: '#1a8c53', w: 8, h: 14, round: false, sway: -30, spin: 320, dur: 4000, d: 2300 },
] as const

export default function OfferCelebration({
  open,
  onClose,
  variant,
  freeUnits = 0,
  dealLabel,
  amountLabel,
  offerTitle,
  offerDescription,
  autoCloseMs = 6000,
}: OfferCelebrationProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Close on Escape, like the coupon popup.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-dismiss after a few seconds so the reward lands and then gets out of the
  // way on its own; the progress bar below counts the same duration down.
  useEffect(() => {
    if (!open || !autoCloseMs) return
    const t = setTimeout(onClose, autoCloseMs)
    return () => clearTimeout(t)
  }, [open, autoCloseMs, onClose])

  if (!open || !mounted) return null

  const isBogo = variant === 'bogo'
  const freeLabel = `${freeUnits} ITEM${freeUnits === 1 ? '' : 'S'} FREE`

  return createPortal(
    <div
      className="ofc-scrim fixed inset-0 z-[70] flex items-center justify-center bg-[#2f1e1a]/60 p-4 backdrop-blur-[3px]"
      onClick={onClose}
    >
      {/* Full-page confetti rain — falls from above the viewport across the whole
          width, behind the card, for a page-wide celebration. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {RAIN.map((p, i) => (
          <span
            key={`rain-${i}`}
            className="ofc-rain absolute block"
            style={{
              left: `${p.x}%`,
              top: '-5%',
              width: p.w, height: p.h,
              background: p.c,
              borderRadius: p.round ? '9999px' : '2px',
              animationDelay: p.d + 'ms',
              animationDuration: p.dur + 'ms',
              ['--sway' as string]: p.sway + 'px',
              ['--spin' as string]: p.spin + 'deg',
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="relative" onClick={(e) => e.stopPropagation()}>
        {/* confetti burst — behind the card, pinned to its centre */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-[42%] h-0 w-0">
          {CONFETTI.map((p, i) => (
            <span
              key={i}
              className="ofc-piece absolute block"
              style={{
                width: p.w, height: p.h,
                background: p.c,
                borderRadius: p.round ? '9999px' : '2px',
                animationDelay: p.d + 'ms',
                ['--tx' as string]: p.tx + 'px',
                ['--ty' as string]: p.ty + 'px',
                ['--r' as string]: p.r + 'deg',
              } as React.CSSProperties}
            />
          ))}

          {/* rising particle field — a continuous ambient shimmer */}
          {PARTICLES.map((p, i) => (
            <span
              key={`pt-${i}`}
              className="ofc-particle absolute block rounded-full"
              style={{
                width: p.sz, height: p.sz,
                background: p.c,
                left: p.x, top: p.y,
                animationDelay: p.d + 'ms',
                animationDuration: p.dur + 'ms',
                ['--ptx' as string]: p.tx + 'px',
              } as React.CSSProperties}
            />
          ))}

          {/* twinkling sparkle stars */}
          {SPARKLES.map((p, i) => (
            <Sparkles
              key={`sp-${i}`}
              className="ofc-sparkle absolute text-[#f5b301]"
              strokeWidth={1.5}
              style={{
                width: p.s, height: p.s,
                left: p.x, top: p.y,
                animationDelay: p.d + 'ms',
              } as React.CSSProperties}
            />
          ))}
        </div>

        <div
          role="status"
          aria-live="polite"
          className="ofc-card relative w-[21rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl bg-white text-center shadow-[0_34px_80px_-28px_rgba(50,25,12,0.8)]"
        >
          {/* soft festive wash at the top */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40"
            style={{
              background: isBogo
                ? 'radial-gradient(90% 100% at 50% 0%, rgba(224,26,27,0.12) 0%, rgba(224,26,27,0) 70%)'
                : 'radial-gradient(90% 100% at 50% 0%, rgba(245,179,1,0.16) 0%, rgba(245,179,1,0) 70%)',
            }}
          />

          <div className="relative px-7 pb-7 pt-9">
            {/* the icon — a gift for BOGO, a coin for savings */}
            <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center">
              {isBogo ? (
                <span className="ofc-pop text-[68px] leading-none drop-shadow-[0_10px_18px_rgba(224,26,27,0.35)]">🎁</span>
              ) : (
                <span className="ofc-pop flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-full bg-linear-to-br from-[#f7c948] to-[#d99400] text-[40px] font-bold text-white shadow-[0_12px_26px_-8px_rgba(217,148,0,0.9)] ring-4 ring-[#fff3d1]">
                  ₹
                </span>
              )}
            </div>

            {isBogo ? (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#c41617]">Offer unlocked!</p>
                <p className="mt-3 font-playfair text-[34px] font-extrabold leading-none text-[#e01a1b]">{freeLabel}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#8a807a]">
                  {dealLabel || 'Buy more, get more free'} — added to your cart automatically.
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#bd8023]">You saved</p>
                <p className="mt-3 font-playfair text-[42px] font-extrabold leading-none tabular-nums text-[#157f4a]">
                  {amountLabel}
                </p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#8a807a]">
                  An offer was applied to your order automatically. Enjoy the savings!
                </p>
              </>
            )}

            {/* Which offer, and what it is — the named deal on a soft chip so the
                shopper sees exactly what was applied, not just the amount. */}
            {(offerTitle || offerDescription) && (
              <div className={`mt-5 rounded-2xl px-4 py-3 text-left ${isBogo ? 'bg-[#fdf3f0] ring-1 ring-[#f3d9d4]' : 'bg-[#fdf7e8] ring-1 ring-[#f0e2c4]'}`}>
                <div className="flex items-center gap-1.5">
                  <Sparkles className={`h-3.5 w-3.5 shrink-0 ${isBogo ? 'text-[#c41617]' : 'text-[#bd8023]'}`} strokeWidth={2} />
                  <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${isBogo ? 'text-[#c41617]' : 'text-[#bd8023]'}`}>
                    Offer applied
                  </span>
                </div>
                {offerTitle && (
                  <p className="mt-1 text-[14px] font-bold text-[#3a2f2a]">{offerTitle}</p>
                )}
                {offerDescription && (
                  <p className="mt-0.5 text-[12.5px] leading-snug text-[#8a807a]">{offerDescription}</p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="mt-6 w-full rounded-full bg-[#e01a1b] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#c41617]"
            >
              Got it, thanks!
            </button>
          </div>

          {/* Auto-dismiss countdown bar — drains left→right over autoCloseMs. */}
          {autoCloseMs > 0 && (
            <span
              aria-hidden
              className="ofc-progress absolute inset-x-0 bottom-0 h-1 origin-left"
              style={{
                background: isBogo ? '#e01a1b' : '#d99400',
                animationDuration: autoCloseMs + 'ms',
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="mx-auto mt-5 flex h-9 w-9 items-center justify-center rounded-full text-white/70 ring-1 ring-white/30 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <style jsx>{`
        @keyframes ofcScrim { from { opacity: 0 } to { opacity: 1 } }
        .ofc-scrim { animation: ofcScrim 200ms ease-out both }

        @keyframes ofcIn {
          0%   { opacity: 0; transform: translateY(16px) scale(0.9) }
          60%  { opacity: 1 }
          100% { opacity: 1; transform: translateY(0) scale(1) }
        }
        .ofc-card { animation: ofcIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both }

        @keyframes ofcPop {
          0%   { transform: scale(0) rotate(-25deg); opacity: 0 }
          55%  { transform: scale(1.18) rotate(6deg); opacity: 1 }
          100% { transform: scale(1) rotate(0deg) }
        }
        .ofc-pop { display: inline-flex; animation: ofcPop 620ms 160ms cubic-bezier(0.34, 1.56, 0.64, 1) both }

        @keyframes ofcBurst {
          0%   { opacity: 0; transform: translate(0, 0) rotate(0) scale(0.6) }
          15%  { opacity: 1 }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--r)) scale(1) }
        }
        .ofc-piece { animation: ofcBurst 1100ms cubic-bezier(0.15, 0.7, 0.3, 1) both }

        /* Twinkle: fade/scale in, hold a beat with a soft pulse, then fade. Runs a
           couple of times so the sparkles keep shimmering while the card is up. */
        @keyframes ofcTwinkle {
          0%   { opacity: 0; transform: scale(0.2) rotate(-20deg) }
          40%  { opacity: 1; transform: scale(1.1) rotate(0deg) }
          70%  { opacity: 0.6; transform: scale(0.9) }
          100% { opacity: 1; transform: scale(1.05) }
        }
        .ofc-sparkle {
          animation: ofcTwinkle 1600ms ease-in-out 2 alternate both;
          filter: drop-shadow(0 0 4px rgba(245, 179, 1, 0.6));
        }

        /* Particles drift upward and dissolve, looping while the card is open. */
        @keyframes ofcParticle {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.5) }
          20%  { opacity: 1 }
          100% { opacity: 0; transform: translate(var(--ptx), -90px) scale(1) }
        }
        .ofc-particle { animation: ofcParticle 2600ms ease-out infinite both }

        @keyframes ofcProgress { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        .ofc-progress { animation: ofcProgress linear both }

        /* Full-page confetti rain: drop from above the viewport to below it, swaying
           sideways and spinning, looping so the page keeps raining while the card is up. */
        @keyframes ofcRain {
          0%   { opacity: 0; transform: translateY(-40px) translateX(0) rotate(0) }
          8%   { opacity: 1 }
          90%  { opacity: 1 }
          100% { opacity: 0; transform: translateY(105vh) translateX(var(--sway)) rotate(var(--spin)) }
        }
        .ofc-rain { animation-name: ofcRain; animation-timing-function: cubic-bezier(0.4, 0.1, 0.6, 1); animation-iteration-count: infinite; will-change: transform, opacity }

        @media (prefers-reduced-motion: reduce) {
          .ofc-scrim, .ofc-card, .ofc-pop, .ofc-piece, .ofc-sparkle, .ofc-particle, .ofc-rain {
            animation-duration: 1ms !important;
            animation-iteration-count: 1 !important;
          }
          .ofc-rain { display: none }
          .ofc-progress { animation-duration: ${autoCloseMs}ms !important }
        }
      `}</style>
    </div>,
    document.body,
  )
}
