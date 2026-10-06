'use client';

import { useState, useEffect } from 'react';
import { Gift, RefreshCw, Check, AlertCircle } from 'lucide-react';
import Dropdown from '@/components/UI/Dropdown';
import creditPointsService, { CreditPointsSettings } from '@/services/creditPointsService';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';

const EARN_ON_OPTIONS = [
  { value: 'DELIVERED', label: 'When the order is delivered' },
  { value: 'PLACED', label: 'When the order is placed' },
];

const REGION_OPTIONS = [
  { value: 'BOTH', label: 'Both regions (.in and .com)' },
  { value: 'IN_ONLY', label: 'India only (.in)' },
  { value: 'COM_ONLY', label: 'International only (.com)' },
];

const DEFAULTS: CreditPointsSettings = {
  enabled: false,
  earnPointsPerUnit: 1,
  earnUnitInr: 100,
  minOrderAmountToEarnInr: 0,
  earnOn: 'DELIVERED',
  redeemValuePerPointInr: 1,
  minPointsToRedeem: 0,
  maxRedeemPercent: 100,
  expiryDays: 0,
  region: 'BOTH',
};

export default function CreditPointsSettingsTab() {
  const [form, setForm] = useState<CreditPointsSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await creditPointsService.getSettings();
      if (res.success && res.data) {
        const { id, ...rest } = res.data;
        setForm({ ...DEFAULTS, ...rest });
      }
    } catch {
      showErrorToast('Failed to load credit points settings');
    } finally {
      setLoading(false);
    }
  };

  // Keep numeric fields as numbers; empty input falls back to 0.
  const setNum = (key: keyof CreditPointsSettings, raw: string) => {
    const n = raw === '' ? 0 : Number(raw);
    setForm((f) => ({ ...f, [key]: Number.isNaN(n) ? 0 : n }));
  };

  const handleSave = async () => {
    // Light validation mirroring the backend constraints.
    if (form.earnUnitInr < 1) {
      showErrorToast('Invalid value', 'Earn unit must be at least ₹1.');
      return;
    }
    if (form.maxRedeemPercent < 0 || form.maxRedeemPercent > 100) {
      showErrorToast('Invalid value', 'Max redeem percent must be between 0 and 100.');
      return;
    }
    try {
      setSaving(true);
      const res = await creditPointsService.updateSettings(form);
      if (res.success) {
        if (res.data) {
          const { id, ...rest } = res.data;
          setForm({ ...DEFAULTS, ...rest });
        }
        showSuccessToast('Credit Points Updated', res.message || 'Settings saved successfully.');
      }
    } catch {
      showErrorToast('Failed to update credit points settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const fieldCls =
    'w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500/40 focus:border-transparent';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">Credit Points</h2>
        <p className="text-sm text-slate-600 mt-1">
          Configure the loyalty rewards program — how customers earn and redeem points.
        </p>
      </div>

      {/* Preview line */}
      <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-lg p-4">
        <Gift className="h-4 w-4 text-brand-600 mt-0.5 shrink-0" />
        <p className="text-sm text-brand-800">
          Customers earn <strong>{form.earnPointsPerUnit}</strong> point(s) per{' '}
          <strong>₹{form.earnUnitInr}</strong> spent. 1 point = <strong>₹{form.redeemValuePerPointInr}</strong>.
          Up to <strong>{form.maxRedeemPercent}%</strong> of an order can be paid with points.
        </p>
      </div>

      {/* Program */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Program</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2 flex items-center justify-between rounded-lg border border-slate-200 p-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Enable credit points</p>
              <p className="text-xs text-slate-500">Turn the loyalty rewards program on or off.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.enabled}
              onClick={() => setForm((f) => ({ ...f, enabled: !f.enabled }))}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                form.enabled ? 'bg-brand-500' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  form.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Region</label>
            <Dropdown
              id="credit-points-region"
              value={form.region}
              options={REGION_OPTIONS}
              onChange={(v) =>
                setForm((f) => ({ ...f, region: (Array.isArray(v) ? v[0] : v) as CreditPointsSettings['region'] }))
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Expiry (days)
            </label>
            <input
              type="number"
              min={0}
              value={form.expiryDays}
              onChange={(e) => setNum('expiryDays', e.target.value)}
              className={fieldCls}
              placeholder="0"
            />
            <p className="text-xs text-slate-500 mt-1">0 = points never expire.</p>
          </div>
        </div>
      </div>

      {/* Earning */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Earning</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Points earned per unit</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.earnPointsPerUnit}
              onChange={(e) => setNum('earnPointsPerUnit', e.target.value)}
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Spend unit (₹)</label>
            <input
              type="number"
              min={1}
              value={form.earnUnitInr}
              onChange={(e) => setNum('earnUnitInr', e.target.value)}
              className={fieldCls}
            />
            <p className="text-xs text-slate-500 mt-1">Amount of spend that earns the points above.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Minimum order to earn (₹)</label>
            <input
              type="number"
              min={0}
              value={form.minOrderAmountToEarnInr}
              onChange={(e) => setNum('minOrderAmountToEarnInr', e.target.value)}
              className={fieldCls}
              placeholder="0"
            />
            <p className="text-xs text-slate-500 mt-1">0 = no minimum.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Earn points</label>
            <Dropdown
              id="credit-points-earn-on"
              value={form.earnOn}
              options={EARN_ON_OPTIONS}
              onChange={(v) =>
                setForm((f) => ({ ...f, earnOn: (Array.isArray(v) ? v[0] : v) as CreditPointsSettings['earnOn'] }))
              }
            />
          </div>
        </div>
      </div>

      {/* Redemption */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Redemption</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Value per point (₹)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.redeemValuePerPointInr}
              onChange={(e) => setNum('redeemValuePerPointInr', e.target.value)}
              className={fieldCls}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Minimum points to redeem</label>
            <input
              type="number"
              min={0}
              value={form.minPointsToRedeem}
              onChange={(e) => setNum('minPointsToRedeem', e.target.value)}
              className={fieldCls}
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Max redeem (% of order)</label>
            <input
              type="number"
              min={0}
              max={100}
              value={form.maxRedeemPercent}
              onChange={(e) => setNum('maxRedeemPercent', e.target.value)}
              className={fieldCls}
            />
            <p className="text-xs text-slate-500 mt-1">0–100. Caps how much of an order points can cover.</p>
          </div>
        </div>
      </div>

      {/* Disabled notice */}
      {!form.enabled && (
        <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-800">
            The credit points program is currently disabled. Customers will not earn or redeem points until you
            enable it above.
          </p>
        </div>
      )}

      {/* Save */}
      <div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
