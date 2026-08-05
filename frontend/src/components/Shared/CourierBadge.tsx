// Renders a courier's visual badge. If the courier has an uploaded `logo`, the image
// is shown (and the code/colour badge is ignored); otherwise it falls back to the
// short code on the brand colour. Used in the admin list/preview, the product courier
// picker and the storefront courier selector so all render identically.

interface CourierBadgeLike {
  code?: string | null;
  color?: string | null;
  logo?: string | null;
  name?: string | null;
}

export default function CourierBadge({
  courier,
  className = 'w-9 h-9 rounded-lg',
  codeClassName = 'text-[10px]',
}: {
  courier: CourierBadgeLike;
  /** Box size + rounding classes (shared by the logo image and the code badge). */
  className?: string;
  /** Font-size class for the code text (ignored when a logo is shown). */
  codeClassName?: string;
}) {
  if (courier.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={courier.logo}
        alt={courier.name || courier.code || 'Courier'}
        className={`object-contain bg-white shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center font-bold text-white shrink-0 ${className} ${codeClassName}`}
      style={{ backgroundColor: courier.color || '#1a1a1a' }}
    >
      {courier.code}
    </span>
  );
}
