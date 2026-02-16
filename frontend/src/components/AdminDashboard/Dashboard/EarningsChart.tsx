'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

// Mock data for earnings/revenue
const earningsData = [
  { month: 'Jan', earnings: 45000, revenue: 52000 },
  { month: 'Feb', earnings: 52000, revenue: 58000 },
  { month: 'Mar', earnings: 48000, revenue: 55000 },
  { month: 'Apr', earnings: 61000, revenue: 68000 },
  { month: 'May', earnings: 55000, revenue: 62000 },
  { month: 'Jun', earnings: 67000, revenue: 75000 },
  { month: 'Jul', earnings: 72000, revenue: 80000 },
  { month: 'Aug', earnings: 68000, revenue: 76000 },
  { month: 'Sep', earnings: 75000, revenue: 83000 },
  { month: 'Oct', earnings: 82000, revenue: 91000 },
  { month: 'Nov', earnings: 78000, revenue: 87000 },
  { month: 'Dec', earnings: 85000, revenue: 95000 }
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900 mb-2">{payload[0].payload.month}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function EarningsChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Earnings & Revenue Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={earningsData}>
            <defs>
              <linearGradient id="colorEarnings" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis 
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `$${value / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ fontSize: '14px', paddingTop: '10px' }}
            />
            <Area 
              type="monotone" 
              dataKey="earnings" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorEarnings)"
              name="Earnings"
              strokeWidth={2}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#colorRevenue)"
              name="Revenue"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
