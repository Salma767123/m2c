/**
 * Helpers for the vendor location field (`mapLink`).
 *
 * The location is stored as a Google Maps **embed** URL so it can be rendered
 * directly inside an `<iframe>` preview. The backend mirrors `parseLatLng`
 * (see `backend/utils/locationUtils.js`) to auto-populate `factoryLatitude`
 * / `factoryLongitude` on save — keep these two in sync.
 *
 * Accepted user input — handled in this order:
 *   1. `<iframe src="…/maps/embed?pb=…">`  (Google Share → Embed a map)
 *   2. Bare embed URL                       (the `src` value alone)
 *   3. Raw coordinates `lat, lng`           (Google right-click → click coords)
 */

export interface LatLng {
  lat: number;
  lng: number;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !(lat === 0 && lng === 0)
  );
}

/**
 * Build a keyless, iframe-embeddable Google Maps URL from coordinates.
 * Used when the vendor pastes raw `lat,lng` from a Google right-click.
 *
 * Only uses `ll=` (center) + `z=` (zoom) — NO `q=` parameter, because
 * `q=` triggers a Google Places reverse-lookup that fails with
 * "Place info couldn't load" when the coords don't match a known place.
 * A CSS pin overlay in the LocationPicker provides the visual marker.
 *
 * Coordinates are serialised at full numeric precision so what the vendor
 * pastes round-trips exactly through save/load — no surprise rounding.
 */
export function buildEmbedUrl(lat: number, lng: number, zoom = 16): string {
  return `https://maps.google.com/maps?ll=${lat},${lng}&z=${zoom}&t=m&output=embed`;
}

/**
 * Recognise the "lat, lng" shape (what Google's right-click → click-coords
 * copies to clipboard, e.g. `9.97186, 78.13481`). Returns the coords or null.
 */
export function parseCoordsPaste(text?: string | null): LatLng | null {
  if (!text) return null;
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return isValidLatLng(lat, lng) ? { lat, lng } : null;
}

/** True when the URL can be safely rendered inside an <iframe>. */
export function isEmbeddableMapUrl(url?: string | null): boolean {
  if (!url) return false;
  return (
    url.includes('google.com/maps/embed') ||
    url.includes('maps.google.com/maps/embed') ||
    /[?&]output=embed/.test(url)
  );
}

/**
 * Pull a map URL out of pasted text — accepts a bare URL or a full Google
 * "Embed a map" `<iframe …>` snippet. Returns null when no URL is found.
 */
export function extractMapUrl(text?: string | null): string | null {
  if (!text) return null;
  const src = text.match(/src=["']([^"']+)["']/i); // <iframe src="…">
  if (src) return src[1];
  const bare = text.match(/https?:\/\/[^\s"'<>]+/i);
  return bare ? bare[0] : null;
}

/**
 * Extract latitude / longitude from a Google Maps embed URL or iframe snippet.
 * Matches the backend `parseMapLinkCoordinates` extractor so what we show in
 * the picker is exactly what gets stored.
 */
export function parseLatLng(value?: string | null): LatLng | null {
  if (!value) return null;
  const url = extractMapUrl(value) || value;

  // Embed "pb" links — !2d<lng>!3d<lat> (reversed order)
  const lng = url.match(/!2d(-?\d+(?:\.\d+)?)/);
  const lat = url.match(/!3d(-?\d+(?:\.\d+)?)/);
  if (lat && lng) {
    const la = parseFloat(lat[1]);
    const ln = parseFloat(lng[1]);
    if (isValidLatLng(la, ln)) return { lat: la, lng: ln };
  }

  // Classic place URL — @LAT,LNG
  const at = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) {
    const la = parseFloat(at[1]);
    const ln = parseFloat(at[2]);
    if (isValidLatLng(la, ln)) return { lat: la, lng: ln };
  }

  // Query-string coords — ?q=LAT,LNG  or  ?ll=LAT,LNG  (our buildEmbedUrl format)
  const qs = url.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qs) {
    const la = parseFloat(qs[1]);
    const ln = parseFloat(qs[2]);
    if (isValidLatLng(la, ln)) return { lat: la, lng: ln };
  }

  return null;
}

/**
 * Sanitize a stored mapLink for use as an `<iframe>` src.
 *
 * Strips `q=lat,lng` (which triggers Google's "Place info couldn't load")
 * and ensures `ll=` is present for centering. Embeds from the "Share →
 * Embed a map" flow (which use `pb=`) are returned untouched.
 */
export function sanitizeEmbedSrc(mapLink: string): string {
  if (!mapLink) return '';
  // Only sanitize our coords-format URLs — leave pb= embeds alone
  if (!(/[?&]q=-?\d/.test(mapLink) && /output=embed/.test(mapLink))) return mapLink;

  let url = mapLink.replace(/([?&])q=-?[\d.]+,-?[\d.]+(&|$)/, (_, prefix, suffix) =>
    suffix ? prefix : '',
  );
  // Ensure ll= is present for centering (preserve full precision)
  if (!url.includes('ll=')) {
    const coords = parseLatLng(mapLink);
    if (coords) {
      const sep = url.includes('?') ? '&' : '?';
      url = `${url}${sep}ll=${coords.lat},${coords.lng}`;
    }
  }
  return url;
}
