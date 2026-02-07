import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/Card'
import { Users, Store, Package, TrendingUp, DollarSign } from 'lucide-react'

const stats = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1% from last month',
    icon: DollarSign,
    color: 'text-green-600',
    borderColor: 'border-green-600',
    bgColor: 'bg-green-50',
  },
  {
    title: 'Total Vendors',
    value: '2,350',
    change: '+180 new vendors',
    icon: Store,
    color: 'text-blue-600',
    borderColor: 'border-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    title: 'Total Products',
    value: '12,234',
    change: '+19% from last month',
    icon: Package,
    color: 'text-purple-600',
    borderColor: 'border-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    title: 'Active Users',
    value: '8,945',
    change: '+12% from last month',
    icon: Users,
    color: 'text-indigo-600',
    borderColor: 'border-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    title: 'Growth Rate',
    value: '24.5%',
    change: '+4.2% from last quarter',
    icon: TrendingUp,
    color: 'text-emerald-600',
    borderColor: 'border-emerald-600',
    bgColor: 'bg-emerald-50',
  },
]

export default function DashboardStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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