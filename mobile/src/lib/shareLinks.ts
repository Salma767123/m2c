/**
 * Builds links that point at the public website.
 *
 * Anything the user shares out of the app has to open for a recipient who does
 * not have the app installed, so shared URLs target the web storefront rather
 * than the `m2c://` scheme.
 *
 * Configure the origin with EXPO_PUBLIC_WEB_URL. If it is unset we derive a best
 * guess by stripping `/api` off the API base — correct when the API and site are
 * served from one host, and harmless when they are not (the share text still
 * carries the product/wishlist description; only the link would be wrong, and an
 * unset var is a deploy-config mistake worth making visible in dev).
 */

const RAW_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL;

function deriveOrigin(): string {
  if (RAW_WEB_URL) return RAW_WEB_URL.replace(/\/+$/, '');

  const api = process.env.EXPO_PUBLIC_API_URL || '';
  const derived = api.replace(/\/+$/, '').replace(/\/api$/, '');
  if (__DEV__ && derived) {
    console.warn(
      '[shareLinks] EXPO_PUBLIC_WEB_URL is not set — falling back to',
      derived,
    );
  }
  return derived;
}

export const WEB_ORIGIN = deriveOrigin();

/** Public URL for a shared wishlist token. */
export function sharedWishlistUrl(token: string): string {
  return `${WEB_ORIGIN}/wishlist/shared/${token}`;
}

/** Public URL for a product detail page. */
export function productUrl(productId: string): string {
  return `${WEB_ORIGIN}/products/${productId}`;
}
