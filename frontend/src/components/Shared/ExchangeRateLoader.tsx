'use client';

import { useEffect } from 'react';
import { setExchangeRate } from '@/lib/currency';

/**
 * Loads the exchange rate once on app startup and caches it in the currency utility.
 * Place in the root layout so all pages have access to the rate.
 */
export function ExchangeRateLoader() {
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchange-rate`);
        const data = await res.json();
        if (data.success && data.data?.rate) {
          setExchangeRate(data.data.rate);
        }
      } catch {
        // Use default rate (83.50)
      }
    };
    load();
  }, []);

  return null;
}
