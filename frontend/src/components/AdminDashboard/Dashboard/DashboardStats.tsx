import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Users, Store, ShoppingCart, DollarSign, TrendingUp } from 'lucide-react'

export default function DashboardStats({ summaryData }: { summaryData: any }) {
  const stats = [
    {
      title: 'Total Earnings',
      value: `$${summaryData.totalEarnings.toLocaleString()}`,
      change: 'Lifetime earnings',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Total Vendors',
      value: summaryData.totalVendors.toLocaleString(),
      change: 'Total registered',
      icon: Store,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Total Customers',
      value: summaryData.totalCustomers.toLocaleString(),
      change: 'Total registered',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Total Orders',
      value: summaryData.totalOrders.toLocaleString(),
      change: 'Total orders placed',
      icon: ShoppingCart,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
    },
    {
      title: 'Total Income',
      value: `$${summaryData.totalIncome.toLocaleString()}`,
      change: 'Lifetime income',
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className={`${stat.bgColor}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <Icon className={`h-6 w-6 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}