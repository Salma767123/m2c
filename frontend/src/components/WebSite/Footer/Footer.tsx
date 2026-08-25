import MainFooterContent from "./MainFooterContent";
import BottomBar from "./BottomBar";

/**
 * The footer ground, on the wrapper rather than on either child.
 *
 * It used to live on MainFooterContent with BottomBar carrying its own solid
 * fill. Two siblings, two backgrounds — so the gradient ran out at the end of
 * one and a flat block began, which is the hard colour break across the bottom
 * of the page. One gradient over both, and the bar is simply the part of it
 * that happens to be darkest.
 *
 * Retoned from oxblood to a deep charcoal (#241d1d → #100c0c) carrying two
 * brand-red corner glows. Red is now the accent — headings, hover states, the
 * CTA and the top hairline — rather than the whole ground, which reads as more
 * premium and modern and matches the black Admin/Vendor/Checker buttons that
 * sit directly beneath the footer. The ink reversed out on charcoal keeps
 * comfortable contrast: neutral links ~9:1, red headings ~5:1, muted body ~6:1.
 */
const FOOTER_GROUND = [
  // Two brand-red glows bleeding in from the corners over a deep charcoal —
  // premium and modern, and it lands under the black Admin/Vendor/Checker
  // buttons so the page bottom reads as one dark zone rather than a red slab.
  'radial-gradient(1100px 480px at 6% -12%, rgba(224, 26, 27, 0.22) 0%, rgba(224, 26, 27, 0) 60%)',
  'radial-gradient(900px 420px at 100% 0%, rgba(224, 26, 27, 0.12) 0%, rgba(224, 26, 27, 0) 55%)',
  'linear-gradient(168deg, #241d1d 0%, #191414 54%, #100c0c 100%)',
].join(', ');

const Footer = () => {
  return (
    <footer className="font-sans w-full" style={{ background: FOOTER_GROUND }}>
      {/* Thin brand-red accent line closing the section above and opening the
          footer — the one bright edge on an otherwise dark block. */}
      <div aria-hidden className="h-px w-full bg-gradient-to-r from-transparent via-[#e01a1b] to-transparent opacity-70" />
      <MainFooterContent />
      <BottomBar />
    </footer>
  );
};

export default Footer;
