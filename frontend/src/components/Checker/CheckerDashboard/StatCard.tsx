import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend: string
  color: "blue" | "amber" | "emerald" | "red"
  onClick?: () => void
}

export default function StatCard({ label, value, icon: Icon, trend, color, onClick }: StatCardProps) {
  const colorClasses = {
    blue: {
      bg: "bg-white",
      border: "border-slate-200/80",
      iconBg: "bg-brand-50",
      iconText: "text-brand-500",
      valueText: "text-slate-900",
      trendText: "text-slate-500",
    },
    amber: {
      bg: "bg-white",
      border: "border-slate-200/80",
      iconBg: "bg-amber-50",
      iconText: "text-amber-500",
      valueText: "text-slate-900",
      trendText: "text-slate-500",
    },
    emerald: {
      bg: "bg-white",
      border: "border-slate-200/80",
      iconBg: "bg-emerald-50",
      iconText: "text-emerald-600",
      valueText: "text-slate-900",
      trendText: "text-slate-500",
    },
    red: {
      bg: "bg-white",
      border: "border-slate-200/80",
      iconBg: "bg-red-50",
      iconText: "text-red-500",
      valueText: "text-slate-900",
      trendText: "text-slate-500",
    },
  }

  const colors = colorClasses[color]

  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`${colors.bg} ${colors.border} border rounded-2xl p-6 shadow-xs transition-all duration-300 hover:shadow-md ${
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:border-brand-500/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 outline-none select-none"
          : ""
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-slate-500 text-sm font-medium mb-2">{label}</p>
          <p className={`text-3.5xl font-bold tracking-tight ${colors.valueText} mb-1`}>{value}</p>
        </div>
        <div className={`${colors.iconBg} p-3 rounded-xl`}>
          <Icon className={`w-6 h-6 ${colors.iconText}`} />
        </div>
      </div>
      <p className={`${colors.trendText} text-sm font-medium`}>{trend}</p>
    </div>
  )
}
