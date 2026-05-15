'use client';

import { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { exchangeRateService } from '@/services/exchangeRateService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

export default function ExchangeRateTab() {
  const [rate, setRate] = useState('');
  const [currentRate, setCurrentRate] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const res = await exchangeRateService.getExchangeRate();
      if (res.success && res.data) {
        setCurrentRate(res.data.rate);
        setRate(String(res.data.rate));
        setLastUpdated(res.data.updatedAt || null);
      }
    } catch {
      showErrorToast('Failed to load exchange rate');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const rateValue = parseFloat(rate);
    if (!rateValue || rateValue <= 0) {
      showErrorToast('Invalid Rate', 'Exchange rate must be a positive number');
      return;
    }

    try {
      setSaving(true);
      const res = await exchangeRateService.updateExchangeRate(rateValue);
      if (res.success) {
        setCurrentRate(res.data.rate);
        setLastUpdated(res.data.updatedAt || new Date().toISOString());
        showSuccessToast('Exchange Rate Updated', res.message);
      }
    } catch {
      showErrorToast('Failed to update exchange rate');
    } finally {
      setSaving(false);
    }
  };

  const previewPrice = (inr: number) => {
    const r = parseFloat(rate) || 83.50;
    return (inr / r).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-900">Currency Exchange Rate</h2>
        <p className="text-sm text-gray-600 mt-1">
          Set the INR to USD exchange rate. All product USD prices will be automatically recalculated.
        </p>
      </div>

      {/* Current Rate Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">USD Exchange Rate</h3>
            <p className="text-xs text-gray-500">1 USD = ₹{currentRate || '—'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input */}
          <div>
            <label htmlFor="exchange-rate" className="block text-sm font-semibold text-gray-700 mb-2">
              1 USD = ₹
            </label>
            <div className="flex gap-3">
              <input
                id="exchange-rate"
                type="number"
                step="0.01"
                min="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-lg font-semibold"
                placeholder="83.50"
              />
              <button
                onClick={handleSave}
                disabled={saving || !rate || parseFloat(rate) <= 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {saving ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? 'Updating...' : 'Update'}
              </button>
            </div>
            {lastUpdated && (
              <p className="text-xs text-gray-500 mt-2">
                Last updated: {new Date(lastUpdated).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          {/* Preview */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Price Preview</p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              {[500, 1000, 2500, 5000, 10000].map((inr) => (
                <div key={inr} className="flex justify-between text-sm">
                  <span className="text-gray-600">₹{inr.toLocaleString('en-IN')}</span>
                  <span className="font-semibold text-gray-900">${previewPrice(inr)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-4">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-semibold mb-1">What happens when you update the rate:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li>All product USD prices are recalculated: <code className="bg-blue-100 px-1 rounded">USD = INR / rate</code></li>
              <li>Product variant USD prices are also updated</li>
              <li>Bag type USD prices are updated</li>
              <li>INR prices are NOT changed — only USD values are recalculated</li>
              <li>The .com website will immediately show the new USD prices</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formula */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Conversion Formula</h3>
        <div className="bg-white rounded-lg p-4 border border-gray-100 font-mono text-sm text-center">
          <span className="text-green-700">USD Price</span> = <span className="text-blue-700">INR Price</span> / <span className="text-orange-700">Exchange Rate</span>
        </div>
        <p className="text-xs text-gray-500 mt-3 text-center">
          Example: ₹2,499 / {rate || '83.50'} = ${previewPrice(2499)}
        </p>
      </div>
    </div>
  );
}
