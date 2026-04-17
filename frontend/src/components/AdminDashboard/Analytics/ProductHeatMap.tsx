'use client';

import { useState, useEffect } from 'react';
import { Flame, Eye, ShoppingCart, TrendingUp, Package, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getProductHeatMap, ProductHeatMapData } from '@/services/analyticsService';

const HEAT_COLORS = ['#dc2626', '#ea580c', '#d97706', '#ca8a04', '#65a30d', '#16a34a', '#0d9488', '#0284c7', '#4f46e5', '#7c3aed'];
const SOURCE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface ProductHeatMapProps {
  period: string;
}

export default function ProductHeatMap({ period }: ProductHeatMapProps) {
  const [data, setData] = useState<ProductHeatMapData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await getProductHeatMap(period);
        if (res.success) setData(res.data);
      } catch (err) {
        console.error('Failed to load product heat map:', err);
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
        <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm">No product view data available yet</p>
      </div>
    );
  }

  const maxViews = Math.max(...(data.products.map(p => p.views) || [1]));

  const getHeatColor = (views: number) => {
    const intensity = Math.min(views / maxViews, 1);
    if (intensity > 0.8) return 'bg-red-500 text-white';
    if (intensity > 0.6) return 'bg-orange-500 text-white';
    if (intensity > 0.4) return 'bg-yellow-500 text-white';
    if (intensity > 0.2) return 'bg-green-500 text-white';
    return 'bg-blue-500 text-white';
  };

  const getHeatBg = (views: number) => {
    const intensity = Math.min(views / maxViews, 1);
    const alpha = Math.round(intensity * 100);
    if (intensity > 0.6) return `rgba(239, 68, 68, ${alpha / 100})`;
    if (intensity > 0.3) return `rgba(249, 115, 22, ${alpha / 100})`;
    return `rgba(59, 130, 246, ${alpha / 100})`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Views</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.totalProductViews.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-purple-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Products Viewed</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{data.products.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingCart className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Avg Conversion</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {data.products.length > 0
              ? (data.products.reduce((sum, p) => sum + p.conversionRate, 0) / data.products.length).toFixed(1)
              : 0}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-red-600" />
            <span className="text-xs font-semibold text-gray-500 uppercase">Hottest Product</span>
          </div>
          <p className="text-sm font-bold text-gray-900 truncate">
            {data.products[0]?.productName || '—'}
          </p>
        </div>
      </div>

      {/* Product Heat Grid */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <Flame className="w-5 h-5 text-red-600" />
          <h3 className="text-lg font-bold text-gray-900">Product Interest Heat Map</h3>
        </div>

        {/* Heat Scale Legend */}
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
          <span>Low</span>
          <div className="flex h-3 rounded-full overflow-hidden flex-1 max-w-[200px]">
            <div className="flex-1 bg-blue-200" />
            <div className="flex-1 bg-blue-400" />
            <div className="flex-1 bg-yellow-400" />
            <div className="flex-1 bg-orange-400" />
            <div className="flex-1 bg-red-500" />
          </div>
          <span>High</span>
        </div>

        {/* Heat Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {data.products.slice(0, 20).map((product) => (
            <div
              key={product.productId}
              className="relative rounded-xl p-3 transition-transform hover:scale-105 cursor-default"
              style={{ backgroundColor: getHeatBg(product.views) }}
            >
              <p className="text-xs font-bold text-white truncate" title={product.productName}>
                {product.productName}
              </p>
              <p className="text-[10px] text-white/80 truncate">{product.category}</p>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Eye className="w-3 h-3 text-white/80" />
                  <span className="text-xs font-bold text-white">{product.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3 text-white/80" />
                  <span className="text-xs font-bold text-white">{product.orders}</span>
                </div>
              </div>
              <div className="mt-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  product.conversionRate > 10 ? 'bg-green-100 text-green-800' :
                  product.conversionRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {product.conversionRate}% conv.
                </span>
              </div>
            </div>
          ))}
        </div>

        {data.products.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            No product views recorded yet. Views will appear as customers browse products.
          </div>
        )}
      </div>

      {/* Category Heat Map + Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Views by Category</h3>
          {data.categoryHeatMap.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.categoryHeatMap} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: '#374151' }} width={75} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                  {data.categoryHeatMap.map((_, i) => (
                    <Cell key={i} fill={HEAT_COLORS[i % HEAT_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No category data</div>
          )}
        </div>

        {/* Traffic Source Pie */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
          <h3 className="text-sm font-bold text-gray-900 mb-4">Traffic Sources</h3>
          {data.sourceBreakdown.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={200}>
                <PieChart>
                  <Pie
                    data={data.sourceBreakdown}
                    dataKey="count"
                    nameKey="source"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {data.sourceBreakdown.map((s, i) => (
                  <div key={s.source} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-xs text-gray-700 capitalize flex-1">{s.source}</span>
                    <span className="text-xs font-bold text-gray-900">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">No source data</div>
          )}
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-gray-700" />
          <h3 className="font-bold text-gray-900">Product Performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Product</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Category</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Views</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Orders</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Qty Sold</th>
                <th className="text-right px-6 py-3 font-semibold text-gray-600">Conversion</th>
                <th className="px-6 py-3 font-semibold text-gray-600">Heat</th>
              </tr>
            </thead>
            <tbody>
              {data.products.slice(0, 15).map((p, i) => (
                <tr key={p.productId} className="border-t border-gray-100 hover:bg-gray-50/50">
                  <td className="px-6 py-3 text-gray-500 font-medium">{i + 1}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900 max-w-[200px] truncate">{p.productName}</td>
                  <td className="px-6 py-3 text-gray-600">{p.category}</td>
                  <td className="px-6 py-3 text-right font-medium">{p.views.toLocaleString()}</td>
                  <td className="px-6 py-3 text-right font-medium">{p.orders}</td>
                  <td className="px-6 py-3 text-right font-medium">{p.quantitySold}</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      p.conversionRate > 10 ? 'bg-green-100 text-green-800' :
                      p.conversionRate > 5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {p.conversionRate}%
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((p.views / maxViews) * 100, 100)}%`,
                          backgroundColor: getHeatBg(p.views),
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.products.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
