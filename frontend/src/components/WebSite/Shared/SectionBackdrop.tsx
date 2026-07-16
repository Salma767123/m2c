/**
 * Decorative backdrop for light product sections — a soft brand-tinted dot
 * grid, drifting blur blobs and abstract outline rings.
 *
 * Purely presentational and non-interactive. Drop it as the first child of a
 * `relative overflow-hidden` section, and give the section's real content a
 * `relative` wrapper so it paints above these layers.
 */
export default function SectionBackdrop() {
  return (
    <>
      {/* Brand-tinted dot grid */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(224,26,27,0.10) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
        }}
      />

      {/* Drifting glow blobs */}
      <div className="pointer-events-none absolute -top-28 -left-24 w-80 h-80 rounded-full bg-[#e01a1b]/[0.07] blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-[#f24344]/[0.06] blur-3xl animate-float-slower" />

      {/* Abstract outline rings */}
      <div className="pointer-events-none absolute -right-20 top-8 w-72 h-72 rounded-full border border-[#e01a1b]/[0.07]" />
      <div className="pointer-events-none absolute -right-4 top-32 w-40 h-40 rounded-full border border-[#e01a1b]/[0.05]" />
      <div className="pointer-events-none absolute -left-24 bottom-4 w-64 h-64 rounded-full border border-[#e01a1b]/[0.06]" />
    </>
  );
}
