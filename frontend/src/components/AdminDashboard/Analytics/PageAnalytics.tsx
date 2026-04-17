'use client';

import { useState, useEffect } from 'react';
import { Eye, Users, Clock, TrendingDown, Monitor, Smartphone, Tablet, Globe, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getPageAnalytics, PageAnalyticsData } from '@/services/analyticsService';

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3b82f6',
  mobile: '#10b981',
  tablet: '#f59e0b',
  unknown: '#94a3b8',
};

const DEVICE_ICONS: Record<string, any> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

interface PageAnalyticsProps {
  period: string;
}

export default function PageAnalytics({ period }: PageAnalyticsProps) {
  const [data, setData] = useState<PageAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getPageAnalytics(period);
        if (res.success) setData(res.data);
      } catch (err) {
        console.error('Failed to load page analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No page analytics data available yet</p>
      </div>
    );
  }

  const viewsChange = data.previousPageViews > 0
    ? Math.round(((data.totalPageViews - data.previousPageViews) / data.previousPageViews) * 100)
    : 0;

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Page Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalPageViews.toLocaleString()}</p>
          {viewsChange !== 0 && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${viewsChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {viewsChange > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(viewsChange)}% vs previous
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Unique Visitors</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.uniqueVisitors.toLocaleString()}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-orange-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Bounce Rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.bounceRate}%</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Avg Duration</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(data.avgDuration)}</p>
        </div>
      </div>

      {/* Page Views Trend */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Page Views Trend</h3>
        {data.trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data.trend}>
              <defs>
                <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                labelFormatter={(v) => new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
              <Area type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} fill="url(#viewsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">No trend data yet</div>
        )}
      </div>

      {/* Top Pages + Device Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Pages */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Top Pages</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-gray-600">Page</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Views</th>
                  <th className="text-right px-6 py-3 font-semibold text-gray-600">Avg Time</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Traffic</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((page, i) => {
                  const percentage = data.totalPageViews > 0 ? (page.views / data.totalPageViews) * 100 : 0;
                  return (
                    <tr key={page.page} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-400 w-5">{i + 1}.</span>
                          <span className="font-medium text-gray-900 font-mono text-xs">{page.page}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{page.views.toLocaleString()}</td>
                      <td className="px-6 py-3 text-right text-gray-600">{formatDuration(page.avgDuration)}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full bg-blue-500"
                              style={{ width: `${Math.min(percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.topPages.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">No page data yet</div>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Device Breakdown</h3>
          {data.deviceBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data.deviceBreakdown}
                    dataKey="count"
                    nameKey="device"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={45}
                  >
                    {data.deviceBreakdown.map((d) => (
                      <Cell key={d.device} fill={DEVICE_COLORS[d.device] || DEVICE_COLORS.unknown} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3 mt-4">
                {data.deviceBreakdown.map((d) => {
                  const Icon = DEVICE_ICONS[d.device] || Globe;
                  const total = data.deviceBreakdown.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                  return (
                    <div key={d.device} className="flex items-center gap-3">
                      <Icon className="w-4 h-4" style={{ color: DEVICE_COLORS[d.device] || '#94a3b8' }} />
                      <span className="text-sm text-gray-700 capitalize flex-1">{d.device}</span>
                      <span className="text-sm font-bold text-gray-900">{pct}%</span>
                      <span className="text-xs text-gray-500">({d.count})</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No device data</div>
          )}
        </div>
      </div>
    </div>
  );
}
