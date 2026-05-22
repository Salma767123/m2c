/**
 * Custom Next.js Image loader for Cloudinary-hosted images.
 *
 * Wired up in next.config.ts via:
 *   images: { loader: 'custom', loaderFile: './src/lib/cloudinaryLoader.ts' }
 *
 * Why this exists
 *   Next.js's default image loader proxies every <Image> through Vercel's
 *   /_next/image optimizer, which counts against a monthly quota. Once the
 *   quota is exhausted Vercel returns 402 Payment Required and every
 *   uncached image variant on the site breaks. Cloudinary already supports
 *   format negotiation, quality compression, and on-the-fly resizing as
 *   URL-level transformations, so we rewrite Cloudinary URLs to use those
 *   primitives directly and skip the Vercel middleman entirely.
 *
 * What it does
 *   - Cloudinary URL  → inject `f_auto,q_auto,w_<width>` after `/upload/`.
 *     • f_auto: serve AVIF / WebP / JPEG depending on browser support
 *       (same negotiation Vercel was doing).
 *     • q_auto: content-aware quality (typically equivalent to q=70-80).
 *     • w_<width>: resize to the variant width Next.js asked for, so
 *       responsive `srcset` still works the same as before.
 *   - Anything else (relative paths, local backend URLs, pexels, unsplash,
 *     data: URIs) → return src untouched. Those load directly without
 *     optimization, same as if the default loader had been bypassed.
 *
 * Idempotency
 *   If a stored Cloudinary URL already contains a transformation segment
 *   (e.g. `/upload/f_auto/...`) we leave it alone instead of stacking new
 *   transforms on top, which would produce nonsense like
 *   `/upload/f_auto,q_auto,w_640/f_auto/...`.
 */

interface CloudinaryLoaderProps {
  src: string;
  width: number;
  quality?: number;
}

const CLOUDINARY_HOST = 'res.cloudinary.com';
const UPLOAD_SEGMENT = '/upload/';

export default function cloudinaryLoader({ src, width }: CloudinaryLoaderProps): string {
  // Only rewrite URLs that point at Cloudinary; everything else passes through.
  if (!src.includes(CLOUDINARY_HOST)) {
    return src;
  }

  const uploadIdx = src.indexOf(UPLOAD_SEGMENT);
  if (uploadIdx === -1) {
    // Cloudinary URL that doesn't follow the /upload/ pattern (rare —
    // e.g. /fetch/, /private/). Leave it alone rather than guess.
    return src;
  }

  // The segment immediately after /upload/ is either a version marker
  // (v123…) or a transformation block (contains commas / underscores).
  // If we already see transformations, don't stack more on top.
  const afterUpload = src.slice(uploadIdx + UPLOAD_SEGMENT.length);
  const firstSegment = afterUpload.split('/')[0] ?? '';
  const alreadyTransformed = !/^v\d+$/.test(firstSegment) && /[,_]/.test(firstSegment);
  if (alreadyTransformed) {
    return src;
  }

  // q_auto is content-aware and typically beats a hardcoded quality value.
  // We intentionally ignore the `quality` argument from Next.js here.
  const transforms = `f_auto,q_auto,w_${width}`;
  return src.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}${transforms}/`);
}
