'use client'

// ─── Face ratings ───────────────────────────────────────────────────────────
//
// Five drawn faces stand in for the five stars on the customer-facing site.
// The stored value is still 1-5 and nothing about the data changes: this is a
// presentation layer over the same number, so averages, filters, sorting and
// the admin/vendor star views all carry on untouched.
//
// These are SVG, not emoji characters, on purpose. 😍 renders as a different
// drawing on iPhone, Android and Windows — three faces for one rating — and on
// some Linux/CI fonts it falls back to a tofu box. Drawn paths are identical
// everywhere and can carry the brand's own colours.

import React from 'react'

export type FaceValue = 1 | 2 | 3 | 4 | 5

/** The word under the face. Same order as the 1-5 value beneath it. */
export const FACE_LABELS: Record<FaceValue, string> = {
  5: 'Loved it',
  4: 'Liked it',
  3: "It's okay",
  2: 'Not great',
  1: 'Disappointed',
}

/**
 * What each threshold actually returns, in words. "& up" was inherited from
 * "4 stars & up" and meant nothing once the stars were gone -- "or better"
 * says the same thing without needing the ladder in your head.
 *
 * The bottom rung is not "Disappointed or better", which would be every rated
 * product described by its worst possible score. It is minRating=1, so what it
 * really selects is "has been reviewed at all" -- and that is what it now says.
 */
export const FACE_FILTER_LABELS: Record<FaceValue, string> = {
  5: 'Loved it',
  4: 'Liked it',
  3: "It's okay",
  2: 'Not great',
  1: 'Disappointed',
}

// All five faces are the same yellow, the way real emoji are: the expression
// carries the meaning, not the colour. The first version graded them amber to
// grey, which read as "this rating is greyed out" rather than "this is the
// sad one". `muted` is a separate, deliberate state for unselected rows.
const WARM = ['#FFEE8C', '#FFD130', '#EFA024']
const GREY = ['#EDE9E3', '#DCD5CC', '#C4BBB0']

/** Features are dark, not white. Emoji have dark features; white punch-outs on
 *  yellow read as a printed icon rather than a face. */
const INK = '#4a2f10'

/**
 * One face, drawn in the shape of a modern emoji: radial gradient body, a
 * glossy highlight off the top-left, rounded features. The gradient id is
 * per-instance via useId, because two SVGs sharing one id in a document is
 * invalid and the second one silently borrows the first one's fill.
 */
export function FaceIcon({
  value,
  className = 'h-5 w-5',
  muted = false,
}: {
  value: FaceValue
  className?: string
  muted?: boolean
}) {
  const uid = React.useId()
  const gid = `m2cFace${uid.replace(/[^a-zA-Z0-9]/g, '')}`
  const [c0, c1, c2] = muted ? GREY : WARM
  const ink = muted ? '#9c9086' : INK

  // Round eyes for most; the happiest face squints, which is most of why it
  // reads as delighted rather than merely smiling.
  const eyes =
    value === 5 ? (
      <>
        <path d="M6.7 10.2a2.3 2.3 0 0 1 4 0" stroke={ink} strokeWidth={1.7} strokeLinecap="round" fill="none" />
        <path d="M13.3 10.2a2.3 2.3 0 0 1 4 0" stroke={ink} strokeWidth={1.7} strokeLinecap="round" fill="none" />
      </>
    ) : (
      <>
        <ellipse cx="8.7" cy="9.9" rx="1.4" ry="1.75" fill={ink} />
        <ellipse cx="15.3" cy="9.9" rx="1.4" ry="1.75" fill={ink} />
      </>
    )

  const mouth = {
    5: <path d="M6.3 13.4h11.4a5.7 5.7 0 0 1-11.4 0Z" fill={ink} />,
    4: <path d="M8 14.2a4.5 4.5 0 0 0 8 0" stroke={ink} strokeWidth={1.9} strokeLinecap="round" fill="none" />,
    3: <path d="M8.5 15h7" stroke={ink} strokeWidth={1.9} strokeLinecap="round" fill="none" />,
    2: <path d="M8 16.1a4.5 4.5 0 0 1 8 0" stroke={ink} strokeWidth={1.9} strokeLinecap="round" fill="none" />,
    1: <path d="M7.6 16.8a5.1 5.1 0 0 1 8.8 0" stroke={ink} strokeWidth={1.9} strokeLinecap="round" fill="none" />,
  }[value]

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <defs>
        <radialGradient id={gid} cx="35%" cy="28%" r="78%">
          <stop offset="0%" stopColor={c0} />
          <stop offset="55%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </radialGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill={`url(#${gid})`} />
      {/* the sheen every emoji has, without which it reads as a flat disc */}
      <ellipse cx="8.4" cy="6.3" rx="3.7" ry="2.2" fill="#fff" opacity={muted ? 0.35 : 0.3} transform="rotate(-24 8.4 6.3)" />
      {/* Only the worst face gets brows. A frown on its own is indistinguishable
          from "Not great" once the icon is down at 16px. */}
      {value === 1 && (
        <>
          <path d="M6.2 7.4 9.6 8.9" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
          <path d="M17.8 7.4 14.4 8.9" stroke={ink} strokeWidth={1.5} strokeLinecap="round" />
        </>
      )}
      {eyes}
      {mouth}
    </svg>
  )
}

/**
 * A rating of 4 or 5 rounds to a face we are willing to show on our own
 * storefront; anything lower returns null and the caller falls back to a plain
 * review count. The negative detail is still there for anyone who opens the
 * reviews section — it just isn't used as merchandising.
 */
export function positiveFace(average: number): FaceValue | null {
  if (!average || average < 3.5) return null
  return average >= 4.5 ? 5 : 4
}

/** How many reviews picked the top face. */
export function lovedCount(ratings: number[]): number {
  return ratings.filter((r) => Math.round(r) === 5).length
}

/**
 * Share of reviews that picked the top face, as a whole percentage.
 *
 * The TOP face only -- not 4-and-5 together, which is what this counted first.
 * "Loved it" has to mean the thing the customer actually tapped, because the
 * breakdown bar directly underneath prints that exact count: ten reviews all at
 * "Liked it" scored "100% loved it" over a bar reading "Loved it 0".
 *
 * Counting both is the more flattering measure and it is what most shops
 * publish, but it needs a different word ("80% positive"), not this one.
 */
export function lovedPercent(ratings: number[]): number {
  if (!ratings.length) return 0
  return Math.round((lovedCount(ratings) / ratings.length) * 100)
}

/**
 * The one-tap input. "How was it?" and five faces beats a five-point judgement
 * on a star row, which is the point of the change: fewer people abandon it.
 * Controlled — the parent still stores a 1-5 number.
 */
export function FacePicker({
  value,
  onChange,
  size = 'h-11 w-11',
}: {
  value: number
  onChange: (v: FaceValue) => void
  size?: string
}) {
  const [hovered, setHovered] = React.useState<FaceValue | null>(null)
  // Bumped on every tap so the bounce replays even when the same face is
  // chosen twice -- a keyed remount is the only way to restart a CSS animation.
  const [taps, setTaps] = React.useState(0)
  const shown = hovered ?? (value as FaceValue) ?? 0

  return (
    <div>
      <div className="flex items-center justify-center gap-2 sm:gap-3" onMouseLeave={() => setHovered(null)}>
        {/* Best first. Left-to-right is worst-to-best on a star row because the
            stars are counting up; with faces there is nothing being counted, and
            the answer most people are reaching for should be the one their thumb
            lands on first. onChange still sends the same 1-5 value. */}
        {([5, 4, 3, 2, 1] as FaceValue[]).map((v) => {
          const active = shown === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => { onChange(v); setTaps((t) => t + 1) }}
              onMouseEnter={() => setHovered(v)}
              onFocus={() => setHovered(v)}
              onBlur={() => setHovered(null)}
              aria-label={FACE_LABELS[v]}
              aria-pressed={value === v}
              className={`m2c-face-wobble rounded-full p-0.5 transition-transform duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e01a1b]/40 ${
                active ? 'scale-110' : ''
              }`}
            >
              {/* Only the face under the cursor (or chosen) is in colour, so the
                  row reads as one question rather than five competing answers.
                  The key restarts the bounce on each tap. */}
              <span key={value === v ? `t${taps}` : `i${v}`} className={`inline-block ${value === v ? 'm2c-face-bounce' : ''}`}>
                <FaceIcon value={v} className={size} muted={!active} />
              </span>
            </button>
          )
        })}
      </div>
      <p className={`mt-2 text-center text-sm font-semibold transition-opacity ${shown ? 'opacity-100' : 'opacity-0'}`}>
        {/* Held in the layout even when empty so choosing a face does not make
            the dialog jump. */}
        <span className={shown ? 'text-[#a06a12]' : 'text-transparent'}>
          {shown ? FACE_LABELS[shown as FaceValue] : '—'}
        </span>
      </p>
    </div>
  )
}
