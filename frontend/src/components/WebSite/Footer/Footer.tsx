import MainFooterContent from "./MainFooterContent";
import BottomBar from "./BottomBar";

/**
 * The footer ground, on the wrapper rather than on either child.
 *
 * It used to live on MainFooterContent with BottomBar carrying its own solid
 * fill. Two siblings, two backgrounds — so the gradient ran out at the end of
 * one and a flat block began, which is the hard colour break across the bottom
 * of the page. One gradient over both, and the bar is simply the part of it
 * that happens to be deepest.
 *
 * Light again, and warm rather than white.
 *
 * The charcoal version worked as a slab but fought the rest of the page: every
 * band above it is white or bone, so the last screen went from a bright shop
 * to a black wall. Linen keeps the page one temperature the whole way down and
 * lets brand red stay the only strong colour in it — headings, the CTA and the
 * hover state, all of which were competing with the dark ground before.
 *
 * Contrast is held where it matters rather than everywhere: body copy #6b625b
 * on linen is ~5.9:1, navigation #3f3a35 is ~9.4:1, red headings #c41617 are
 * ~5.2:1. The wordmark closing the footer is deliberately below that — it is
 * texture, not text, and it is marked aria-hidden.
 */
const FOOTER_GROUND = [
  // Two brand-red washes bleeding in from the corners, at a twentieth of the
  // strength they carried on charcoal. On a light ground the same opacity
  // reads as a pink stain rather than as light.
  'radial-gradient(1100px 520px at 6% -12%, rgba(224, 26, 27, 0.055) 0%, rgba(224, 26, 27, 0) 62%)',
  'radial-gradient(900px 440px at 100% 2%, rgba(196, 22, 23, 0.045) 0%, rgba(196, 22, 23, 0) 58%)',
  'linear-gradient(172deg, #fdfbf8 0%, #f8f2ea 48%, #f1eae0 100%)',
].join(', ');

const Footer = () => {
  return (
    <footer className="font-sans w-full" style={{ background: FOOTER_GROUND }}>
      {/* One brand-red hairline, and nothing else, closing the section above
          and opening the footer.

          A woven band sat under it for a while — an eight-pixel plain weave
          standing in for the selvedge a length of cloth is cut from. It was
          removed at the client's request: at that scale the over-and-under
          read as a dotted or hatched strip rather than as cloth, which made it
          look like a divider someone had picked the wrong style for. The
          hairline was doing the separating on its own anyway. */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-[#e01a1b] to-transparent opacity-60" />
      <MainFooterContent />
      <BottomBar />
    </footer>
  );
};

export default Footer;
