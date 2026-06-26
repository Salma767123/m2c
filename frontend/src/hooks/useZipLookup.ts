"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { lookupZipMulti, type ZipPlace } from "@/lib/zipLookup";

export interface UseZipLookupResult {
  /** True while the API request is in flight. */
  loading: boolean;
  /** All matching places for the last successful lookup. */
  places: ZipPlace[];
  /** The currently selected place (first by default). */
  selected: ZipPlace | null;
  /** Call when the user picks a different area from the dropdown. */
  selectPlace: (place: ZipPlace) => void;
  /**
   * Trigger a lookup.  Call this onBlur of the ZIP field or when the
   * value reaches the expected length (6 digits for India).
   */
  runLookup: (zip: string, country: string) => void;
  /** Clear results (e.g. when ZIP is cleared by the user). */
  clear: () => void;
}

/**
 * Manages ZIP / PIN code lookup state for an address form section.
 *
 * @param onResult  Called whenever the selected place changes.
 *                  Receive the resolved city, state, area, and country so
 *                  the parent form can update its own state.
 */
export function useZipLookup(
  onResult: (place: ZipPlace) => void,
): UseZipLookupResult {
  const [loading, setLoading] = useState(false);
  const [places, setPlaces] = useState<ZipPlace[]>([]);
  const [selected, setSelected] = useState<ZipPlace | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track last queried zip+country to avoid redundant fetches
  const lastKey = useRef<string>("");

  const runLookup = useCallback(
    async (zip: string, country: string) => {
      const key = `${zip.trim()}::${country}`;
      if (!zip.trim() || key === lastKey.current) return;
      lastKey.current = key;

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      setLoading(true);
      try {
        const results = await lookupZipMulti(zip, country, ctrl.signal);
        if (ctrl.signal.aborted) return;

        setPlaces(results);
        if (results.length > 0) {
          setSelected(results[0]);
          onResult(results[0]);
        } else {
          setSelected(null);
        }
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    },
    [onResult],
  );

  const selectPlace = useCallback(
    (place: ZipPlace) => {
      setSelected(place);
      onResult(place);
    },
    [onResult],
  );

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setPlaces([]);
    setSelected(null);
    lastKey.current = "";
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { loading, places, selected, selectPlace, runLookup, clear };
}
