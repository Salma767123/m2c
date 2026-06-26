/**
 * ZIP / PIN code lookup.
 *
 * India (IN): uses the free India Post Pincode API which returns all
 * matching post-office (area/locality) records for a PIN, including
 * district, state, and country.  Supports the multi-area dropdown.
 *
 * Other countries: falls back to zippopotam.us, which returns a single
 * place per postal code.
 *
 * Used by address forms in the Vendor Registration and other flows to
 * auto-fill City, State, and — for India — area/locality details.
 */

/** A single resolved place for a ZIP / PIN code. */
export interface ZipPlace {
  /** Post-office / locality / area name (e.g. "Anna Nagar"). */
  area: string;
  /** City or district (e.g. "Chennai"). */
  city: string;
  /** District label — for India this is city + " District". */
  district: string;
  /** State or province (e.g. "Tamil Nadu"). */
  state: string;
  /** Country name (e.g. "India"). */
  country: string;
}

/**
 * Format a ZipPlace as a dropdown option label.
 * Shows only Area / Locality and District — keeps options clean and scannable.
 * India:  "Anna Nagar – Chennai District"
 * Others: "Springfield – Illinois" (state used as fallback when no district)
 */
export function zipPlaceLabel(p: ZipPlace): string {
  const second = p.city || p.state;
  if (p.area && second && p.area !== second) return `${p.area}, ${second}`;
  return p.area || p.city || p.state;
}

/** Legacy single-result shape — kept for backward compat. */
export interface ZipLookupResult {
  city: string;
  state: string;
  country: string;
  countryIso: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// India Post Pincode API
// ─────────────────────────────────────────────────────────────────────────────

async function lookupIndiaPin(
  pin: string,
  signal?: AbortSignal,
): Promise<ZipPlace[]> {
  if (!/^\d{6}$/.test(pin.trim())) return [];
  try {
    const res = await fetch(
      `https://api.postalpincode.in/pincode/${encodeURIComponent(pin.trim())}`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const block = Array.isArray(data) ? data[0] : null;
    if (!block || block.Status !== 'Success') return [];
    const offices: any[] = block.PostOffice || [];
    return offices.map((o) => {
      const dist = o.District || o.Division || '';
      return {
        area: o.Name || '',
        city: dist,
        district: dist ? dist + ' District' : '',
        state: o.State || o.Circle || '',
        country: o.Country || 'India',
      };
    });
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Zippopotam.us (international fallback)
// ─────────────────────────────────────────────────────────────────────────────

const PHONE_COUNTRY_ISO: Record<string, string> = {
  Afghanistan: 'AF', Albania: 'AL', Algeria: 'DZ', Angola: 'AO', Argentina: 'AR',
  Armenia: 'AM', Australia: 'AU', Austria: 'AT', Azerbaijan: 'AZ', Bangladesh: 'BD',
  Belarus: 'BY', Belgium: 'BE', Bolivia: 'BO', Brazil: 'BR', Bulgaria: 'BG',
  Cambodia: 'KH', Canada: 'CA', Chile: 'CL', China: 'CN', Colombia: 'CO',
  Croatia: 'HR', Cyprus: 'CY', 'Czech Republic': 'CZ', Denmark: 'DK', Ecuador: 'EC',
  Egypt: 'EG', Ethiopia: 'ET', Finland: 'FI', France: 'FR', Georgia: 'GE',
  Germany: 'DE', Ghana: 'GH', Greece: 'GR', Guatemala: 'GT', Honduras: 'HN',
  'Hong Kong': 'HK', Hungary: 'HU', Iceland: 'IS', India: 'IN', Indonesia: 'ID',
  Iran: 'IR', Iraq: 'IQ', Ireland: 'IE', Israel: 'IL', Italy: 'IT',
  Jamaica: 'JM', Japan: 'JP', Jordan: 'JO', Kazakhstan: 'KZ', Kenya: 'KE',
  Kuwait: 'KW', Kyrgyzstan: 'KG', Laos: 'LA', Latvia: 'LV', Lebanon: 'LB',
  Libya: 'LY', Lithuania: 'LT', Luxembourg: 'LU', Macau: 'MO', Malaysia: 'MY',
  Mexico: 'MX', Moldova: 'MD', Mongolia: 'MN', Morocco: 'MA', Mozambique: 'MZ',
  Myanmar: 'MM', Nepal: 'NP', Netherlands: 'NL', 'New Zealand': 'NZ', Nicaragua: 'NI',
  Nigeria: 'NG', Norway: 'NO', Oman: 'OM', Pakistan: 'PK', Panama: 'PA',
  Paraguay: 'PY', Peru: 'PE', Philippines: 'PH', Poland: 'PL', Portugal: 'PT',
  'Puerto Rico': 'PR', Qatar: 'QA', Romania: 'RO', Russia: 'RU', Rwanda: 'RW',
  'Saudi Arabia': 'SA', Senegal: 'SN', Serbia: 'RS', Singapore: 'SG', Slovakia: 'SK',
  Slovenia: 'SI', Somalia: 'SO', 'South Africa': 'ZA', 'South Korea': 'KR',
  Spain: 'ES', 'Sri Lanka': 'LK', Sudan: 'SD', Sweden: 'SE', Switzerland: 'CH',
  Syria: 'SY', Taiwan: 'TW', Tajikistan: 'TJ', Tanzania: 'TZ', Thailand: 'TH',
  Tunisia: 'TN', Turkey: 'TR', Turkmenistan: 'TM', Uganda: 'UG', Ukraine: 'UA',
  'United Arab Emirates': 'AE', 'United Kingdom': 'GB', 'United States': 'US',
  Uruguay: 'UY', Uzbekistan: 'UZ', Venezuela: 'VE', Vietnam: 'VN', Yemen: 'YE',
  Zambia: 'ZM', Zimbabwe: 'ZW',
};

async function lookupZippopotam(
  zip: string,
  iso: string,
  countryName: string,
  signal?: AbortSignal,
): Promise<ZipPlace[]> {
  try {
    const res = await fetch(
      `https://api.zippopotam.us/${iso}/${encodeURIComponent(zip.trim())}`,
      { signal },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const places: any[] = data?.places || [];
    return places.map((p) => ({
      area: p['place name'] || '',
      city: p['place name'] || '',
      district: '',
      state: p.state || '',
      country: data.country || countryName,
    }));
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Look up a ZIP / PIN code and return all matching places.
 * Returns an empty array if lookup fails or the code is invalid.
 *
 * @param zip         The postal / PIN code entered by the user.
 * @param countryName The country *name* as stored in the form (e.g. "India").
 * @param signal      Optional AbortSignal to cancel in-flight requests.
 */
export async function lookupZipMulti(
  zip: string,
  countryName: string,
  signal?: AbortSignal,
): Promise<ZipPlace[]> {
  const trimmed = zip.trim();
  if (!trimmed) return [];

  // India gets full post-office data with multiple areas per PIN
  if (countryName === 'India' || countryName === 'IN') {
    return lookupIndiaPin(trimmed, signal);
  }

  // International: resolve country name → ISO code and use zippopotam
  const iso = PHONE_COUNTRY_ISO[countryName];
  if (!iso) return [];
  return lookupZippopotam(trimmed, iso, countryName, signal);
}

/**
 * Legacy single-result lookup — kept so existing callers don't break.
 * New code should prefer `lookupZipMulti`.
 */
export async function lookupZipCode(
  zip: string,
  countryIso: string,
  signal?: AbortSignal,
): Promise<ZipLookupResult | null> {
  const trimmed = zip.trim();
  const iso = countryIso.trim().toUpperCase();
  if (!trimmed || !iso || iso.length !== 2) return null;
  try {
    const res = await fetch(
      `https://api.zippopotam.us/${iso}/${encodeURIComponent(trimmed)}`,
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
    return null;
  }
}
