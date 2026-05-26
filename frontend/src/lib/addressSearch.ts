/**
 * Address autocomplete via Nominatim (OpenStreetMap).
 *
 * Free, no API key — but Nominatim's usage policy asks for:
 *   - reasonable rate (≤1 req/sec per IP) → callers should debounce
 *   - a meaningful Referer / User-Agent → the browser provides Referer
 *
 * For higher volume or guaranteed SLAs, swap the URL for a hosted
 * Nominatim instance (e.g. MapTiler, LocationIQ) or Google Places — the
 * `AddressSuggestion` shape is structured to map onto any provider.
 */

export interface AddressSuggestion {
  /** Stable id for React list keys. */
  id: string;
  /** Full address as a single human-readable string (for display). */
  displayName: string;
  lat: number;
  lon: number;
  /** Address Line 1 — best-effort combination of house number + street. */
  line1: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  /** ISO-3166-1 alpha-2 (upper-case), e.g. "IN", "US". */
  countryIso: string;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  hamlet?: string;
  village?: string;
  town?: string;
  city?: string;
  city_district?: string;
  county?: string;
  state?: string;
  state_district?: string;
  region?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
}

function pickLine1(addr: NominatimAddress): string {
  const street = [addr.house_number, addr.road || addr.pedestrian]
    .filter(Boolean)
    .join(' ');
  return street || addr.neighbourhood || addr.suburb || addr.hamlet || '';
}

function pickCity(addr: NominatimAddress): string {
  return (
    addr.city ||
    addr.town ||
    addr.village ||
    addr.city_district ||
    addr.county ||
    ''
  );
}

function pickState(addr: NominatimAddress): string {
  return addr.state || addr.state_district || addr.region || '';
}

/**
 * Search worldwide addresses by free-text query. Returns up to 5 matches.
 * Returns [] on network error or queries shorter than 3 characters.
 *
 * Callers should debounce input by ~300-500ms before invoking, both to
 * respect Nominatim's rate limit and to keep the UI responsive.
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal,
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', trimmed);
  url.searchParams.set('format', 'json');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '5');

  try {
    const res = await fetch(url.toString(), {
      signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    return data.map((item) => {
      const addr = item.address || {};
      return {
        id: String(item.place_id),
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lon: parseFloat(item.lon),
        line1: pickLine1(addr),
        city: pickCity(addr),
        state: pickState(addr),
        postcode: addr.postcode || '',
        country: addr.country || '',
        countryIso: (addr.country_code || '').toUpperCase(),
      };
    });
  } catch {
    // AbortError or network failure — caller falls back to manual entry
    return [];
  }
}
