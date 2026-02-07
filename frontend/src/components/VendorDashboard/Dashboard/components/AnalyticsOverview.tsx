'use client';

import { Card, CardContent } from '@/components/UI/Card';
import { DollarSign, Users, Eye, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Metric {
  label: string;
  value: number;
  change: number;
  icon: React.ElementType;
}

interface AnalyticsData {
  revenue: { current: number; change: number };
  customers: { current: number; change: number };
  views?: { current: number; change: number };
}

interface AnalyticsOverviewProps {
  analytics: AnalyticsData;
}

const formatCurrency = (amount: number) => `$${amount.toLocaleString()}`;
const changeIcon = (change: number) => (change >= 0 ? ArrowUpRight : ArrowDownRight);
const changeColor = (change: number) => (change >= 0 ? 'text-green-600' : 'text-gray-700');

export default function AnalyticsOverview({ analytics }: AnalyticsOverviewProps) {
  const metrics: Metric[] = [
    {
      label: 'Revenue',
      value: analytics.revenue.current,
      change: analytics.revenue.change,
      icon: DollarSign,
    },
    {
      label: 'Customers',
      value: analytics.customers.current,
      change: analytics.customers.change,
      icon: Users,
    },
  ];

  if (analytics.views) {
    metrics.push({
      label: 'Page Views',
      value: analytics.views.current,
      change: analytics.views.change,
      icon: Eye,
    });
  }

  return (
    <div>
      <h2 className="text-xl sm:text-2xl font-bold text-[#222222] mb-4 sm:mb-6">Analytics Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const ChangeIcon = changeIcon(metric.change);
          const isCurrency = metric.label === 'Revenue';
          const displayValue = isCurrency ? formatCurrency(metric.value) : metric.value.toLocaleString();

          return (
            <Card
              key={metric.label}
              className="border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-700 transition-all duration-200"
            >
              <CardContent className="p-5 sm:p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 mb-1">{metric.label}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#222222] mb-2">{displayValue}</p>
                    <div className="flex items-center mt-2">
                      <ChangeIcon className={`w-4 h-4 ${changeColor(metric.change)}`} />
                      <span
                        className={`text-xs sm:text-sm font-semibold ml-1 ${changeColor(metric.change)}`}
                      >
                        {Math.abs(metric.change)}%
                      </span>
                      <span className="text-xs sm:text-sm text-slate-500 ml-1">vs last month</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
