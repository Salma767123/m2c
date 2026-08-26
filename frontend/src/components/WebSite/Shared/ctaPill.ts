/**
 * The red call-to-action pill, in one place.
 *
 * Featured, Top Selling and Best Sellers all render "View All Products" and all
 * three had drifted to a different size — px-6/py-3/text-sm, px-6/py-2.5/
 * text-[13.5px], px-7/py-3/text-[15px]. On a desktop they are far enough apart
 * on the page that nobody notices; scrolling a phone they arrive one after
 * another, three buttons with the same words at three different sizes, and the
 * page reads as unfinished.
 *
 * Height is set explicitly rather than left to padding + line-height. The Top
 * Selling masthead sets this pill beside the rail's two arrow buttons, and
 * matching them meant guessing what py-3 at text-[15px] resolves to. h-11 and
 * h-11 simply agree.
 *
 * 44px on a phone is the floor for a thumb, which is why the small step is up
 * at sm rather than down below it.
 *
 * Layout is deliberately NOT in here — width, centring and margins are the
 * caller's, because Best Sellers centres it under a grid while Top Selling
 * sets it inline next to the arrows.
 */
export const CTA_PILL =
  'btn-shine group inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-full ' +
  'bg-[#e01a1b] px-5 text-[14px] font-semibold text-white ' +
  'shadow-[0_10px_26px_-8px_rgba(224,26,27,0.55)] transition-all duration-300 ' +
  'hover:-translate-y-0.5 hover:bg-[#c41617] hover:shadow-[0_16px_34px_-10px_rgba(224,26,27,0.6)] ' +
  'sm:h-12 sm:px-7 sm:text-[15px]';

/** The trailing arrow, sized to the pill it sits in. */
export const CTA_PILL_ICON =
  'h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1';

/**
 * The rail's circular arrow buttons, which stand beside CTA_PILL in the Top
 * Selling masthead. Same heights at both breakpoints, so the row has one
 * baseline rather than three.
 */
export const RAIL_BUTTON =
  'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#dcc9bd] bg-white text-[#7a0f10] ' +
  'transition-all duration-300 hover:border-[#e01a1b] hover:bg-[#e01a1b] hover:text-white ' +
  'disabled:cursor-not-allowed disabled:border-[#ece4dc] disabled:bg-white disabled:text-[#cbbcb2] ' +
  'disabled:hover:bg-white sm:h-12 sm:w-12';
