'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

// Mock data for sales by category
const salesData = [
  { name: 'Bedding', value: 35, amount: 125000 },
  { name: 'Towels', value: 25, amount: 89000 },
  { name: 'Table Linen', value: 20, amount: 71000 },
  { name: 'Blankets', value: 12, amount: 43000 },
  { name: 'Others', value: 8, amount: 28000 }
]

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#6b7280']

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">
          Sales: {payload[0].value}%
        </p>
        <p className="text-sm text-gray-600">
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

export default function SalesReportChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Report by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={salesData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {salesData.map((entry, index) => (
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
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Total Sales</p>
            <p className="text-xl font-bold text-gray-900">
              ${salesData.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Top Category</p>
            <p className="text-xl font-bold text-gray-900">{salesData[0].name}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
