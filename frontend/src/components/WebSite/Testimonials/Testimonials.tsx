'use client';

import { useEffect, useState } from 'react';
import { Star, Sparkles } from 'lucide-react';
import reviewService, { PublicExperienceReview } from '@/services/reviewService';

/**
 * Homepage testimonials — approved purchase-experience feedback.
 *
 * A staggered wall of chat-bubble cards in three columns that drift vertically
 * at different speeds and directions (a parallax marquee), pausing on hover.
 * Each bubble carries the quote with a little tail, and the reviewer (avatar +
 * name + role) sits beneath it. Light theme; the section hides when nothing is
 * approved, and falls back to a centred static row when there are too few
 * reviews to fill columns.
 */

// Per-column marquee tuning: seconds and scroll direction. Middle column runs
// the other way so the columns visibly parallax against each other.
const COLUMN_STYLE = [
    { duration: 34, reverse: false, mt: 0 },
    { duration: 44, reverse: true, mt: 40 },
    { duration: 38, reverse: false, mt: 20 },
];

function Stars({ rating }: { rating: number }) {
    return (
        <div className="flex gap-0.5" aria-label={`${rating} out of 5`}>
            {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
            ))}
        </div>
    );
}

function initialOf(name?: string | null) {
    return (name || 'M').trim().charAt(0).toUpperCase();
}

function Bubble({ r }: { r: PublicExperienceReview }) {
    return (
        <figure className="mb-9">
            {/* Speech bubble */}
            <div className="relative rounded-2xl border border-[#ece3df] bg-white p-5 shadow-[0_12px_34px_-20px_rgba(26,26,26,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-20px_rgba(224,26,27,0.28)]">
                <div className="mb-2"><Stars rating={r.rating} /></div>
                <p className="text-sm leading-relaxed text-[#4b4540]">
                    {r.comment ? `“${r.comment}”` : '“A great experience shopping with M2C.”'}
                </p>
                {/* tail */}
                <span className="absolute -bottom-2 left-8 h-4 w-4 rotate-45 border-b border-r border-[#ece3df] bg-white" />
            </div>
            {/* Reviewer */}
            <figcaption className="mt-5 flex items-center gap-3 pl-2">
                <span className="rounded-full bg-gradient-to-br from-[#e01a1b] to-[#ff9d4d] p-[1.5px]">
                    <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-white text-sm font-bold text-[#c41617]">
                        {r.user?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={r.user.image} alt={r.user?.name || 'Customer'} className="h-full w-full object-cover" />
                        ) : (
                            initialOf(r.user?.name)
                        )}
                    </span>
                </span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-bold uppercase tracking-wide text-[#1a1a1a]">
                        {r.user?.name || 'Verified Customer'}
                    </p>
                    <p className="truncate text-xs italic text-[#9a8f89]">
                        {r.user?.country ? `${r.user.country} · ` : ''}Verified Purchase
                    </p>
                </div>
            </figcaption>
        </figure>
    );
}

export default function Testimonials() {
    const [reviews, setReviews] = useState<PublicExperienceReview[]>([]);
    const [summary, setSummary] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        reviewService.getPublicExperienceReviews(12).then((res) => {
            if (cancelled) return;
            setReviews(res.data || []);
            setSummary(res.summary || { average: 0, count: 0 });
            setLoaded(true);
        });
        return () => { cancelled = true; };
    }, []);

    if (!loaded || reviews.length === 0) return null;

    const useColumns = reviews.length >= 3;

    // Round-robin into three columns so each stays balanced as the list grows.
    const columns: PublicExperienceReview[][] = [[], [], []];
    reviews.forEach((r, i) => columns[i % 3].push(r));

    return (
        <section className="relative isolate overflow-hidden bg-[#fbf6f3] py-16 font-sans sm:py-20 lg:py-24">
            {/* soft aurora */}
            <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
                <div className="tst-orb tst-orb-a" />
                <div className="tst-orb tst-orb-b" />
                <div className="absolute inset-0 opacity-[0.5] [background-image:linear-gradient(to_right,#efe2dd_1px,transparent_1px),linear-gradient(to_bottom,#efe2dd_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,#000_35%,transparent_75%)]" />
            </div>

            {/* Header */}
            <div className="mx-auto max-w-2xl px-4 text-center">
                <span className="inline-flex items-center gap-2 rounded-full border border-[#f0d9d3] bg-white/70 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#c41617] backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5" /> Testimonials
                </span>
                <h2 className="mt-5 font-playfair text-3xl font-semibold tracking-tight text-[#1a1a1a] sm:text-4xl md:text-5xl">
                    What customers say about{' '}
                    <span className="bg-gradient-to-r from-[#e01a1b] via-[#ff6a3d] to-[#ff9d4d] bg-clip-text text-transparent">M2C</span>
                </h2>
                {summary.count > 0 && (
                    <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#efe2dd] bg-white px-5 py-2.5 shadow-[0_12px_40px_-16px_rgba(224,26,27,0.35)]">
                        <span className="text-lg font-bold text-[#1a1a1a]">{summary.average.toFixed(1)}</span>
                        <Stars rating={summary.average} />
                        <span className="text-xs text-[#7a716c]">from {summary.count} shopper{summary.count === 1 ? '' : 's'}</span>
                    </div>
                )}
            </div>

            {/* Wall */}
            {useColumns ? (
                <div className="tst-wall group relative mx-auto mt-12 grid max-w-6xl grid-cols-1 gap-6 px-4 sm:grid-cols-2 lg:grid-cols-3">
                    {columns.map((col, ci) => {
                        if (col.length === 0) return null;
                        const cfg = COLUMN_STYLE[ci];
                        // The third column is hidden until lg so mobile isn't three tall strips.
                        return (
                            <div
                                key={ci}
                                className={`tst-colmask relative h-[460px] overflow-hidden md:h-[560px] ${ci === 2 ? 'hidden lg:block' : ci === 1 ? 'hidden sm:block' : ''}`}
                                style={{ marginTop: cfg.mt }}
                            >
                                <div
                                    className="tst-track group-hover:[animation-play-state:paused] motion-reduce:animate-none"
                                    style={{ animationDuration: `${cfg.duration}s`, animationDirection: cfg.reverse ? 'reverse' : 'normal' }}
                                >
                                    {[...col, ...col].map((r, i) => (
                                        <Bubble key={`${r.id}-${i}`} r={r} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="mx-auto mt-12 flex max-w-4xl flex-wrap items-start justify-center gap-6 px-4">
                    {reviews.map((r) => (
                        <div key={r.id} className="w-full max-w-sm">
                            <Bubble r={r} />
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .tst-orb {
                    position: absolute; border-radius: 9999px; filter: blur(80px); opacity: 0.5; will-change: transform;
                }
                .tst-orb-a {
                    width: 460px; height: 460px; top: -160px; left: -90px;
                    background: radial-gradient(circle at 30% 30%, rgba(224, 26, 27, 0.26), transparent 70%);
                    animation: tstFloatA 16s ease-in-out infinite;
                }
                .tst-orb-b {
                    width: 540px; height: 540px; bottom: -220px; right: -140px;
                    background: radial-gradient(circle at 60% 40%, rgba(255, 138, 61, 0.24), transparent 70%);
                    animation: tstFloatB 20s ease-in-out infinite;
                }
                /* Fade the top & bottom of each drifting column. */
                .tst-colmask {
                    -webkit-mask-image: linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent);
                    mask-image: linear-gradient(to bottom, transparent, #000 10%, #000 90%, transparent);
                }
                .tst-track {
                    animation-name: tstScroll;
                    animation-timing-function: linear;
                    animation-iteration-count: infinite;
                    will-change: transform;
                }
                @keyframes tstScroll {
                    from { transform: translateY(0); }
                    to { transform: translateY(-50%); }
                }
                @keyframes tstFloatA {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(40px, 30px) scale(1.08); }
                }
                @keyframes tstFloatB {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(-50px, -30px) scale(1.1); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .tst-orb { animation: none; }
                    .tst-track { animation: none; }
                }
            `}</style>
        </section>
    );
}
