'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Sales by category chart

// Brand-led, on-palette series colors (brand red → success green → tertiary blue → amber → slate)
const COLORS = ['#e01a1b', '#16a34a', '#0074c8', '#f59e0b', '#64748b']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900">{payload[0].name}</p>
        <p className="text-sm text-slate-600">
          Sales: {payload[0].value}%
        </p>
        <p className="text-sm text-slate-600">
          Amount: ${payload[0].payload.amount.toLocaleString()}
        </p>
      </div>
    )
  }
  return null
}

const renderCustomLabel = (entry: any) => {
  return `${entry.value}%`
}

export default function SalesReportChart({ salesData }: { salesData: any[] }) {
  // ensure we have at least one dummy item if empty so chart doesn't crash
  const data = salesData && salesData.length > 0 ? salesData : [{ name: 'No Data', value: 100, amount: 0 }]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Report by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-sm">
                  {value} ({entry.payload.value}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary Stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Total Sales</p>
            <p className="text-xl font-bold text-slate-900">
              ${data.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-xs text-slate-600 mb-1">Top Category</p>
            <p className="text-xl font-bold text-slate-900">{data[0]?.name || 'N/A'}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
