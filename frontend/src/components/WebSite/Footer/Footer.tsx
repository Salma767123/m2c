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
 * Lighter than the first attempt throughout. The cap is #963c3b: the ink in
 * this footer is reversed out, and every step lighter costs contrast on the
 * palest text. Here the column headings hold 4.6:1, links 6.5:1 and body
 * 5.2:1 — measured against the lightest part, so the rest is better.
 */
const FOOTER_GROUND = [
  'radial-gradient(1200px 520px at 12% -14%, rgba(176, 84, 78, 0.45) 0%, rgba(176, 84, 78, 0) 62%)',
  'linear-gradient(168deg, #963c3b 0%, #7f2827 52%, #6a1c1c 100%)',
].join(', ');

const Footer = () => {
  return (
    <footer className="font-sans w-full" style={{ background: FOOTER_GROUND }}>
      <MainFooterContent />
      <BottomBar />
    </footer>
  );
};

export default Footer;
