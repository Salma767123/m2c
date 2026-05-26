/**
 * ZIP / postal-code lookup via zippopotam.us — a free public service that
 * returns city / state / country for a postal code in ~60 countries
 * (IN, US, GB, CA, AU, DE, FR, BR, MX, JP, SG, etc.). No API key needed.
 *
 * Used by address forms (CompanyDetails, WarehouseDetails, Checkout,
 * Profile address book) to auto-fill City and State once the user types a
 * ZIP, then lets them edit the result. Country must already be selected
 * because the API is per-country.
 */

export interface ZipLookupResult {
  city: string;
  state: string;
  country: string;
  countryIso: string;
}

/**
 * Look up a ZIP / postal code for a given ISO-3166-1 alpha-2 country code.
 * Returns null if the lookup fails (network error, unknown code, country
 * not covered). Callers should fall back to manual entry on null.
 */
export async function lookupZipCode(
  zip: string,
  countryIso: string,
  signal?: AbortSignal,
): Promise<ZipLookupResult | null> {
  const trimmedZip = zip.trim();
  const iso = countryIso.trim().toUpperCase();
  if (!trimmedZip || !iso || iso.length !== 2) return null;

  try {
    const res = await fetch(
      `https://api.zippopotam.us/${iso}/${encodeURIComponent(trimmedZip)}`,
      { signal },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const place = data?.places?.[0];
    if (!place) return null;
    return {
      city: place['place name'] || '',
      state: place.state || '',
      country: data.country || '',
      countryIso: data['country abbreviation'] || iso,
    };
  } catch {
    // AbortError, network failure, or non-JSON response — caller falls back
    return null;
  }
}
