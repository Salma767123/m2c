import { Country, State, ICountry, IState } from 'country-state-city';
import {
  parsePhoneNumberFromString,
  isValidPhoneNumber,
  AsYouType,
  CountryCode,
  getExampleNumber,
} from 'libphonenumber-js';
import examples from 'libphonenumber-js/examples.mobile.json';

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
// Letters (incl. accented), spaces, hyphens, apostrophes, dots — works for international names
export const NAME_REGEX = /^[\p{L}\s\-'.]+$/u;

export const DEFAULT_COUNTRY_ISO: CountryCode = 'IN';

export interface CountryOption {
  isoCode: string;
  name: string;
  flag: string;
  phoneCode: string;
}

export interface StateOption {
  isoCode: string;
  name: string;
}

let cachedCountries: CountryOption[] | null = null;

export function getCountries(): CountryOption[] {
  if (cachedCountries) return cachedCountries;
  cachedCountries = Country.getAllCountries()
    .map((c: ICountry) => ({
      isoCode: c.isoCode,
      name: c.name,
      flag: c.flag,
      phoneCode: c.phonecode?.startsWith('+') ? c.phonecode : `+${c.phonecode}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cachedCountries;
}

export function getCountry(isoCode: string): CountryOption | undefined {
  return getCountries().find((c) => c.isoCode === isoCode);
}

// Accepts an ISO-2 code, ISO-3 code, or display name (legacy data e.g. "United States").
// Returns a valid ISO-2 code, falling back to DEFAULT_COUNTRY_ISO when nothing matches.
export function normalizeCountryToIso(value?: string | null): string {
  if (!value) return DEFAULT_COUNTRY_ISO;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_COUNTRY_ISO;

  const upper = trimmed.toUpperCase();
  const all = getCountries();
  const byIso = all.find((c) => c.isoCode === upper);
  if (byIso) return byIso.isoCode;

  const byName = all.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName.isoCode;

  return DEFAULT_COUNTRY_ISO;
}

export function getStates(countryIso: string): StateOption[] {
  if (!countryIso) return [];
  return State.getStatesOfCountry(countryIso)
    .map((s: IState) => ({ isoCode: s.isoCode, name: s.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Display helpers — safe for rendering legacy data (full names, ISO-2, ISO-3, or empty).
export function getCountryName(value?: string | null): string {
  if (!value) return '';
  const iso = normalizeCountryToIso(value);
  return getCountry(iso)?.name ?? value;
}

export function getCountryFlag(value?: string | null): string {
  if (!value) return '';
  const iso = normalizeCountryToIso(value);
  return getCountry(iso)?.flag ?? '';
}

// Accepts an ISO state code ("CA"), a full state name ("California"), or
// legacy free-text. Returns the canonical display name when matched, or the
// raw input otherwise — never throws.
export function getStateName(stateValue: string, countryValue?: string | null): string {
  if (!stateValue) return '';
  const trimmed = String(stateValue).trim();
  if (!trimmed) return '';
  const iso = normalizeCountryToIso(countryValue);
  const byCode = State.getStateByCodeAndCountry(trimmed.toUpperCase(), iso);
  if (byCode) return byCode.name;
  const list = State.getStatesOfCountry(iso) || [];
  const byName = list.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
  return byName?.name ?? trimmed;
}

// Per-country postal code regex. Falls back to a generic "3-12 alphanumeric/space/dash" check
// for countries not listed below. Sources: Universal Postal Union + country postal authorities.
const POSTAL_CODE_RULES: Record<string, { regex: RegExp; placeholder: string; label: string }> = {
  US: { regex: /^\d{5}(-\d{4})?$/, placeholder: '10001 or 10001-1234', label: 'ZIP Code' },
  IN: { regex: /^[1-9]\d{5}$/, placeholder: '110001', label: 'PIN Code' },
  GB: { regex: /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i, placeholder: 'SW1A 1AA', label: 'Postcode' },
  CA: { regex: /^[A-CEGHJ-NPR-TVXY]\d[A-CEGHJ-NPR-TV-Z]\s*\d[A-CEGHJ-NPR-TV-Z]\d$/i, placeholder: 'K1A 0B1', label: 'Postal Code' },
  AU: { regex: /^\d{4}$/, placeholder: '2000', label: 'Postcode' },
  DE: { regex: /^\d{5}$/, placeholder: '10115', label: 'Postleitzahl' },
  FR: { regex: /^\d{5}$/, placeholder: '75001', label: 'Code Postal' },
  IT: { regex: /^\d{5}$/, placeholder: '00100', label: 'CAP' },
  ES: { regex: /^\d{5}$/, placeholder: '28001', label: 'Código Postal' },
  NL: { regex: /^\d{4}\s?[A-Z]{2}$/i, placeholder: '1011 AB', label: 'Postcode' },
  BR: { regex: /^\d{5}-?\d{3}$/, placeholder: '01310-100', label: 'CEP' },
  MX: { regex: /^\d{5}$/, placeholder: '01000', label: 'Código Postal' },
  JP: { regex: /^\d{3}-?\d{4}$/, placeholder: '100-0001', label: '郵便番号' },
  CN: { regex: /^\d{6}$/, placeholder: '100000', label: 'Postal Code' },
  SG: { regex: /^\d{6}$/, placeholder: '238859', label: 'Postal Code' },
  AE: { regex: /^.{3,10}$/, placeholder: '00000', label: 'Postal Code' },
  SA: { regex: /^\d{5}(-?\d{4})?$/, placeholder: '11564', label: 'Postal Code' },
  ZA: { regex: /^\d{4}$/, placeholder: '2000', label: 'Postal Code' },
  NZ: { regex: /^\d{4}$/, placeholder: '6011', label: 'Postcode' },
  CH: { regex: /^\d{4}$/, placeholder: '8001', label: 'Postleitzahl' },
  SE: { regex: /^\d{3}\s?\d{2}$/, placeholder: '111 22', label: 'Postnummer' },
  NO: { regex: /^\d{4}$/, placeholder: '0150', label: 'Postnummer' },
  DK: { regex: /^\d{4}$/, placeholder: '1050', label: 'Postnummer' },
  FI: { regex: /^\d{5}$/, placeholder: '00100', label: 'Postinumero' },
  IE: { regex: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i, placeholder: 'D02 AF30', label: 'Eircode' },
  BE: { regex: /^\d{4}$/, placeholder: '1000', label: 'Postal Code' },
  AT: { regex: /^\d{4}$/, placeholder: '1010', label: 'Postal Code' },
  PL: { regex: /^\d{2}-\d{3}$/, placeholder: '00-001', label: 'Kod Pocztowy' },
  PT: { regex: /^\d{4}-\d{3}$/, placeholder: '1000-001', label: 'Código Postal' },
  KR: { regex: /^\d{5}$/, placeholder: '03000', label: 'Postal Code' },
  RU: { regex: /^\d{6}$/, placeholder: '101000', label: 'Postal Code' },
};

const FALLBACK_POSTAL = {
  regex: /^[A-Za-z0-9\s\-]{3,12}$/,
  placeholder: 'Postal code',
  label: 'Postal Code',
};

export function getPostalRule(countryIso: string) {
  return POSTAL_CODE_RULES[countryIso?.toUpperCase()] ?? FALLBACK_POSTAL;
}

export function validatePostalCode(value: string, countryIso: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return getPostalRule(countryIso).regex.test(trimmed);
}

// ---------- Phone (libphonenumber-js, global) ----------

export function formatPhoneAsYouType(value: string, countryIso: string): string {
  const code = (countryIso?.toUpperCase() || DEFAULT_COUNTRY_ISO) as CountryCode;
  try {
    return new AsYouType(code).input(value);
  } catch {
    return value;
  }
}

export function validatePhone(value: string, countryIso: string): boolean {
  if (!value?.trim()) return false;
  const code = (countryIso?.toUpperCase() || DEFAULT_COUNTRY_ISO) as CountryCode;
  try {
    return isValidPhoneNumber(value, code);
  } catch {
    return false;
  }
}

export function getPhoneExample(countryIso: string): string {
  const code = (countryIso?.toUpperCase() || DEFAULT_COUNTRY_ISO) as CountryCode;
  try {
    const example = getExampleNumber(code, examples);
    return example?.formatNational() ?? '';
  } catch {
    return '';
  }
}

// Normalize to E.164 (e.g. "+919876543210") for storage / API submission.
export function toE164(value: string, countryIso: string): string {
  const code = (countryIso?.toUpperCase() || DEFAULT_COUNTRY_ISO) as CountryCode;
  try {
    const parsed = parsePhoneNumberFromString(value, code);
    return parsed?.number ?? value.trim();
  } catch {
    return value.trim();
  }
}

// Format a stored phone (typically E.164 like "+919876543210") for human display.
// Falls back to the input value if parsing fails (e.g. legacy non-E.164 strings).
// `defaultCountry` is used as a hint when the value lacks a "+" prefix.
export function formatPhoneForDisplay(value?: string | null, defaultCountry?: string): string {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  try {
    // E.164 numbers parse without a country hint
    const parsed = trimmed.startsWith('+')
      ? parsePhoneNumberFromString(trimmed)
      : parsePhoneNumberFromString(
          trimmed,
          ((defaultCountry || DEFAULT_COUNTRY_ISO).toUpperCase()) as CountryCode,
        );
    if (parsed?.isValid()) return parsed.formatInternational();
    if (parsed) return parsed.formatNational();
    return trimmed;
  } catch {
    return trimmed;
  }
}
