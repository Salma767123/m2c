'use client';

import { useState } from 'react';
import { BarChart3, Flame, Globe } from 'lucide-react';
import ProductHeatMap from '@/components/AdminDashboard/Analytics/ProductHeatMap';
import PageAnalytics from '@/components/AdminDashboard/Analytics/PageAnalytics';

const PERIODS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: '7 Days' },
  { value: '30days', label: '30 Days' },
  { value: '3months', label: '3 Months' },
  { value: '6months', label: '6 Months' },
  { value: '1year', label: '1 Year' },
];

const TABS = [
  { id: 'heatmap', label: 'Product Heat Map', icon: Flame },
  { id: 'pages', label: 'Page Analytics', icon: Globe },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30days');
  const [activeTab, setActiveTab] = useState('heatmap');

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-7 h-7 text-gray-900" />
            <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          </div>
          <p className="text-gray-600">Product heat map and website page performance tracking</p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                period === p.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'heatmap' && <ProductHeatMap period={period} />}
      {activeTab === 'pages' && <PageAnalytics period={period} />}
    </div>
  );
}
