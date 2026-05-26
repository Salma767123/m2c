'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MousePointerClick,
  Code2,
} from 'lucide-react';
import {
  buildEmbedUrl,
  extractMapUrl,
  isEmbeddableMapUrl,
  parseCoordsPaste,
  parseLatLng,
  sanitizeEmbedSrc,
} from '@/lib/mapLink';

interface LocationPickerProps {
  /** Current value — a Google Maps embed URL (the `mapLink` field). */
  value: string;
  /** Called with the embed URL whenever a valid one is pasted (or '' when cleared). */
  onChange: (mapLink: string) => void;
  error?: string;
  required?: boolean;
  label?: string;
}

type Mode = 'coords' | 'embed';

/**
 * Look at an existing stored value and decide which input mode it was
 * created in, so the right tab opens up when editing a saved vendor.
 */
function detectMode(value: string): Mode {
  if (!value) return 'coords';
  // Our coords-paste path emits `…/maps?ll=<lat>,<lng>&q=<lat>,<lng>&…&output=embed`
  // (also match the older `?q=<lat>,<lng>` only format for backward compatibility).
  if (/maps\.google\.com\/maps\?(?:ll|q)=[-\d.]+,[-\d.]+/.test(value)) return 'coords';
  return 'embed';
}

export default function LocationPicker({
  value,
  onChange,
  error,
  required,
  label = 'Location',
}: LocationPickerProps) {
  const [mode, setMode] = useState<Mode>(() => detectMode(value));

  // Each tab keeps its own input state so switching back-and-forth doesn't
  // wipe what the user typed in the other tab.
  const [coordsInput, setCoordsInput] = useState<string>(() => {
    const c = parseLatLng(value);
    return c ? `${c.lat}, ${c.lng}` : '';
  });
  const [embedInput, setEmbedInput] = useState<string>(value || '');

  // External value changes (e.g. async edit-form load) → resync the tab
  // we're currently looking at, so the field never goes stale.
  useEffect(() => {
    const next = detectMode(value);
    setMode(next);
    const c = parseLatLng(value);
    if (c) setCoordsInput(`${c.lat}, ${c.lng}`);
    if (value !== embedInput) setEmbedInput(value || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // ── Tab handlers ────────────────────────────────────────────────────────

  const handleCoordsChange = (input: string) => {
    setCoordsInput(input);
    const coords = parseCoordsPaste(input);
    onChange(coords ? buildEmbedUrl(coords.lat, coords.lng) : '');
  };

  const handleEmbedChange = (input: string) => {
    setEmbedInput(input);
    const url = extractMapUrl(input) || input.trim();
    onChange(url && isEmbeddableMapUrl(url) ? url : '');
  };

  const valid = !!value && isEmbeddableMapUrl(value);
  const showCoordsHint = mode === 'coords' && coordsInput.trim().length > 0 && !valid;
  const showEmbedHint = mode === 'embed' && embedInput.trim().length > 0 && !valid;

  const previewCoords = useMemo(() => parseLatLng(value), [value]);

  // Sanitize the iframe src so Google doesn't show "Place info couldn't load".
  const previewSrc = useMemo(() => sanitizeEmbedSrc(value), [value]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-base font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 text-lg ml-1">*</span>}
        </label>
        {valid && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Map linked
          </span>
        )}
      </div>

      {/* Tab switcher */}
      <div
        role="tablist"
        className="inline-flex p-1 bg-gray-100 rounded-lg gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'coords'}
          onClick={() => setMode('coords')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'coords'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <MousePointerClick className="w-4 h-4" />
          Coordinates
          <span
            className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
              mode === 'coords' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
            }`}
          >
            Recommended
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'embed'}
          onClick={() => setMode('embed')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'embed'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Embed code
        </button>
      </div>

      {/* ── Coordinates tab ────────────────────────────────────────────── */}
      {mode === 'coords' && (
        <div className="space-y-3">
          <input
            type="text"
            inputMode="decimal"
            value={coordsInput}
            onChange={(e) => handleCoordsChange(e.target.value)}
            placeholder="e.g.  9.97189, 78.13491"
            className={`w-full px-4 py-3 border rounded-lg text-base font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error || showCoordsHint ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">
              How to get the exact coordinates
            </p>
            <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
              <li>
                Open{' '}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Google Maps
                </a>{' '}
                and find your factory.
              </li>
              <li>
                <strong>Right-click</strong> exactly on the spot (or long-press on mobile).
              </li>
              <li>
                The first item in the menu is the coordinates, e.g.{' '}
                <code className="bg-white border border-gray-200 rounded px-1.5 py-0.5 text-xs">
                  9.97189, 78.13491
                </code>
                . <strong>Click it</strong> to copy.
              </li>
              <li>Paste them into the box above.</li>
            </ol>
            <p className="text-xs text-gray-500 pt-1">
              This drops the pin <strong>exactly</strong> where you clicked — no view-centre offset.
            </p>
          </div>

          {showCoordsHint && (
            <p className="flex items-start gap-1 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              That doesn&apos;t look like valid coordinates. Use the format{' '}
              <code className="bg-amber-100 px-1 rounded">lat, lng</code> — e.g.{' '}
              <code className="bg-amber-100 px-1 rounded">9.97189, 78.13491</code>.
            </p>
          )}
        </div>
      )}

      {/* ── Embed code tab ─────────────────────────────────────────────── */}
      {mode === 'embed' && (
        <div className="space-y-3">
          <textarea
            value={embedInput}
            onChange={(e) => handleEmbedChange(e.target.value)}
            rows={3}
            placeholder={'<iframe src="https://www.google.com/maps/embed?pb=..."></iframe>'}
            className={`w-full px-4 py-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y ${
              error || showEmbedHint ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
          />

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-900">
              How to get the embed code
            </p>
            <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
              <li>
                Open{' '}
                <a
                  href="https://www.google.com/maps"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Google Maps
                </a>{' '}
                and find your factory.
              </li>
              <li>
                Click <strong>Share</strong> → <strong>Embed a map</strong> →{' '}
                <strong>Copy HTML</strong>.
              </li>
              <li>Paste the whole snippet into the box above.</li>
            </ol>
            <p className="text-xs text-amber-700 pt-1 flex items-start gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              The embed link stores Google&apos;s view-centre, which can be ~10–30 m off
              from the exact pin. Use <strong>Coordinates</strong> if you need pin-perfect placement.
            </p>
          </div>

          {showEmbedHint && (
            <p className="flex items-start gap-1 text-amber-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              That doesn&apos;t look like an embed link. Use{' '}
              <strong>Share → Embed a map</strong> and paste the whole{' '}
              <code className="bg-amber-100 px-1 rounded">&lt;iframe&gt;</code> code.
            </p>
          )}
        </div>
      )}

      {/* ── Live map preview ───────────────────────────────────────────── */}
      {valid ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-red-500" />
              Map Preview
            </span>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open
            </a>
          </div>
          <div className="relative">
            <iframe
              src={previewSrc}
              width="100%"
              height="320"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Location map preview"
              className="w-full block"
            />
            {/* CSS pin overlay — replaces Google's native marker since we don't
                use q= (which would trigger "Place info couldn't load"). */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -100%)',
              }}
            >
              <svg
                width="32"
                height="42"
                viewBox="0 0 32 42"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 0C7.164 0 0 7.164 0 16c0 12 16 26 16 26s16-14 16-26C32 7.164 24.836 0 16 0z"
                  fill="#EA4335"
                />
                <circle cx="16" cy="16" r="6" fill="white" />
              </svg>
            </div>
          </div>
          {previewCoords && (
            <div className="bg-gray-50 px-4 py-2 border-t border-gray-200 flex items-center justify-between">
              <span className="text-xs text-gray-500">Coordinates</span>
              <span className="text-xs font-mono text-gray-700">
                {previewCoords.lat.toFixed(6)}, {previewCoords.lng.toFixed(6)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-gray-300 rounded-lg h-40 flex flex-col items-center justify-center text-center px-6">
          <MapPin className="w-10 h-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            {mode === 'coords'
              ? 'Paste coordinates above and your factory pin will appear here.'
              : 'Paste an embed link above and your factory pin will appear here.'}
          </p>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-red-500 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </p>
      )}
    </div>
  );
}
