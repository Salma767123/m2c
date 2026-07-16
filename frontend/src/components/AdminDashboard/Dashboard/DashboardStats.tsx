import { Users, Store, ShoppingCart, IndianRupee, TrendingUp } from 'lucide-react'
import { formatPrice } from '@/lib/currency'

export default function DashboardStats({ summaryData }: { summaryData: any }) {
  // Both figures are SUM(Order.totalAmountINR) — see adminDashboardController's
  // totalIncome. They are rupees, and were rendered with a '$', overstating the
  // headline revenue ~83x to anyone reading it as dollars.
  const stats = [
    {
      title: 'Total Earnings',
      value: formatPrice(summaryData.totalEarnings, 'INR'),
      change: 'Lifetime earnings',
      icon: IndianRupee,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
    {
      title: 'Total Vendors',
      value: summaryData.totalVendors.toLocaleString(),
      change: 'Total registered',
      icon: Store,
      color: 'text-brand-500',
      iconBg: 'bg-brand-50',
    },
    {
      title: 'Total Customers',
      value: summaryData.totalCustomers.toLocaleString(),
      change: 'Total registered',
      icon: Users,
      color: 'text-blue-600',
      iconBg: 'bg-blue-50',
    },
    {
      title: 'Total Orders',
      value: summaryData.totalOrders.toLocaleString(),
      change: 'Total orders placed',
      icon: ShoppingCart,
      color: 'text-amber-600',
      iconBg: 'bg-amber-50',
    },
    {
      title: 'Total Income',
      value: formatPrice(summaryData.totalIncome, 'INR'),
      change: 'Lifetime income',
      icon: TrendingUp,
      color: 'text-emerald-600',
      iconBg: 'bg-emerald-50',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-5">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.title}
            className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs transition-all duration-300 hover:shadow-md"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <p className="text-slate-500 text-sm font-medium mb-2">{stat.title}</p>
                <p className="text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl shrink-0 ${stat.iconBg}`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.change}</p>
          </div>
        )
      })}
    </div>
  )
}
