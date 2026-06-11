'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card';

interface PerformanceMetrics {
  rating: string;
  satisfaction: string;
  fulfillmentTime: string;
}

interface PerformanceOverviewProps {
  performance: PerformanceMetrics;
}

export default function PerformanceOverview({ performance }: PerformanceOverviewProps) {
  return (
    <Card className="border border-slate-200 shadow-sm hover:border-slate-700 transition-all">
      <CardHeader className="bg-slate-50 border-b border-slate-200">
        <CardTitle className="text-lg font-bold text-slate-900">Performance Overview</CardTitle>
      </CardHeader>
      <CardContent className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="text-center p-4 bg-slate-50 rounded-lg hover:bg-slate-200 transition-colors">
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{performance.rating}</p>
            <p className="text-sm sm:text-base text-slate-700 font-medium">Average Rating</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg hover:bg-slate-200 transition-colors">
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{performance.satisfaction}</p>
            <p className="text-sm sm:text-base text-slate-700 font-medium">Customer Satisfaction</p>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg hover:bg-slate-200 transition-colors">
            <p className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{performance.fulfillmentTime}</p>
            <p className="text-sm sm:text-base text-slate-700 font-medium">Avg. Fulfillment Time</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
