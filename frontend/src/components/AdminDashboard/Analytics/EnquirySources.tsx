'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, MessageSquare, TrendingUp } from 'lucide-react';
import { contactEnquiryService } from '@/services/contactEnquiryService';
import { getHearAboutUsLabel } from '@/lib/enquirySources';

interface EnquirySourcesProps {
  period: string;
}

interface SourceRow {
  value: string;
  label: string;
  count: number;
  pct: number;
}

// Single series → one hue (magnitude is already carried by bar length), so no
// categorical palette and no legend. Matches the chart tokens used by the other
// analytics tabs.
const BAR_COLOR = '#e01a1b';
// "Not specified" is absence of data, not a competing source — de-emphasise it
// in the same neutral the other analytics tabs use for "unknown".
const BAR_MUTED = '#94a3b8';
const GRID = '#f1f5f9';
const TICK = '#64748b';

export default function EnquirySources({ period }: EnquirySourcesProps) {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await contactEnquiryService.getSourceReport(period);
        if (cancelled) return;
        const t = res.data?.total || 0;
        const ordered = (res.data?.sources || [])
          .map((s) => ({
            value: s.value,
            label: s.value === 'unspecified' ? 'Not specified' : getHearAboutUsLabel(s.value),
            count: s.count,
            pct: t ? Math.round((s.count / t) * 1000) / 10 : 0,
          }))
          .filter((s) => s.count > 0)
          .sort((a, b) => b.count - a.count);
        setTotal(t);
        setRows(ordered);
      } catch {
        if (!cancelled) { setRows([]); setTotal(0); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-300" />
        <p className="text-sm">No enquiries in this period yet</p>
        <p className="text-xs text-slate-400 mt-1">
          The breakdown appears once visitors submit the contact form.
        </p>
      </div>
    );
  }

  const topSource = rows[0];
  // Attributed = everything except the "Not specified" bucket.
  const attributed = rows.filter((r) => r.value !== 'unspecified').reduce((sum, r) => sum + r.count, 0);
  const attributedPct = total ? Math.round((attributed / total) * 100) : 0;
  // Long category names need room on the axis.
  const chartHeight = Math.max(220, rows.length * 46);

  return (
    <div className="space-y-6">
      {/* Headline figures */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Total Enquiries</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Top Source</p>
          </div>
          <p className="text-base font-bold text-slate-900 truncate" title={topSource.label}>{topSource.label}</p>
          <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
            {topSource.count.toLocaleString()} · {topSource.pct}% of total
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <p className="text-xs font-medium text-slate-500">Attributed</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{attributedPct}%</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {attributed.toLocaleString()} of {total.toLocaleString()} told us
          </p>
        </div>
      </div>

      {/* Ranked bars — one hue; "Not specified" is muted so it reads as absence
          of data rather than a competing source. */}
      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-sm font-bold text-slate-900 mb-1">How They Heard About Us</h3>
        <p className="text-xs text-slate-400 mb-4">Enquiries by acquisition source, most common first</p>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 8 }} barCategoryGap={10}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: TICK }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={190}
              tick={{ fontSize: 11, fill: TICK }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              formatter={((value: any, _name: any, item: any) => [
                `${value} ${Number(value) === 1 ? 'enquiry' : 'enquiries'} · ${item?.payload?.pct}%`,
                'Enquiries',
              ]) as any}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {rows.map((r) => (
                <Cell key={r.value} fill={r.value === 'unspecified' ? BAR_MUTED : BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Exact values — a table is the right companion past ~7 categories. */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Source Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3 font-semibold">Source</th>
                <th className="px-6 py-3 font-semibold text-right">Enquiries</th>
                <th className="px-6 py-3 font-semibold text-right">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.value} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: r.value === 'unspecified' ? BAR_MUTED : BAR_COLOR }}
                      />
                      <span className={r.value === 'unspecified' ? 'text-slate-500 italic' : 'text-slate-800'}>
                        {r.label}
                      </span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-semibold text-slate-900 tabular-nums">{r.count.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-slate-600 tabular-nums">{r.pct}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200">
              <tr>
                <td className="px-6 py-3 font-semibold text-slate-700">Total</td>
                <td className="px-6 py-3 text-right font-bold text-slate-900 tabular-nums">{total.toLocaleString()}</td>
                <td className="px-6 py-3 text-right text-slate-500 tabular-nums">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
