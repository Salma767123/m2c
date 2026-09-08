'use client';

import Image from 'next/image';
import { Package } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * CategoryImage — the single, consistent way to render a category / subcategory
 * image anywhere in the storefront.
 *
 * Design rules (applied uniformly so one uploaded original works everywhere):
 *  · The container is a FIXED aspect-ratio box per section (square/portrait/…),
 *    so the crop window is identical across desktop / tablet / mobile.
 *  · The image uses `object-fit: cover` + `object-position: center`, so it fills
 *    the box without ever stretching or distorting, keeping the subject centred
 *    (nothing important is unnecessarily cropped).
 *  · `next/image` with `fill` + a required `sizes` string gives responsive,
 *    DPR-correct downloads on every breakpoint.
 *  · A neutral placeholder is shown when the category has no image.
 *
 * Overlays (gradients, captions, badges) are passed as `children` and layered
 * over the image inside the same ratio box.
 */

export type CategoryImageRatio = 'square' | 'portrait' | 'landscape' | 'wide' | 'banner';

// Section-specific fixed ratios. `banner` steps wider on larger screens so a
// hero reads as a band on desktop but stays tall enough to be legible on phones.
const RATIO_CLASS: Record<CategoryImageRatio, string> = {
  square: 'aspect-square',                                  // 1:1 — listing / strip thumbnails
  portrait: 'aspect-[4/5]',                                 // 4:5 — homepage "Shop by Category" tiles
  landscape: 'aspect-[4/3]',                                // 4:3 — subcategory cards
  wide: 'aspect-[16/9]',                                    // 16:9 — compact banners
  banner: 'aspect-[16/9] sm:aspect-[21/9] lg:aspect-[12/5]', // responsive hero band
};

interface CategoryImageProps {
  src?: string | null;
  alt: string;
  /** Section preset ratio. Ignored when `ratioClassName` is given. */
  ratio?: CategoryImageRatio;
  /** Escape hatch for a bespoke ratio, e.g. 'aspect-[3/2]'. Overrides `ratio`. */
  ratioClassName?: string;
  /** Responsive next/image `sizes` — required so the browser picks the right file. */
  sizes: string;
  /** Extra container classes (rounding, ring, background, hover, …). */
  className?: string;
  /** Extra <img> classes (e.g. a hover zoom). object-cover/center are always applied. */
  imgClassName?: string;
  /** Override object-position (defaults to center). e.g. 'center top'. */
  objectPosition?: string;
  priority?: boolean;
  /** Overlays / captions / badges layered over the image. */
  children?: ReactNode;
}

export default function CategoryImage({
  src,
  alt,
  ratio = 'square',
  ratioClassName,
  sizes,
  className = '',
  imgClassName = '',
  objectPosition,
  priority,
  children,
}: CategoryImageProps) {
  const aspect = ratioClassName || RATIO_CLASS[ratio];
  return (
    <div className={`relative w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 ${aspect} ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={`object-cover object-center ${imgClassName}`}
          style={objectPosition ? { objectPosition } : undefined}
          // Hide a broken image (keep the box + neutral background) rather than
          // showing a torn icon.
          onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <Package className="h-1/5 max-h-12 min-h-6 w-auto text-gray-400" />
        </div>
      )}
      {children}
    </div>
  );
}
