'use client';

import { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface StatItem {
  title: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color?: string;
  bgColor?: string;
  iconBg?: string;
  href?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        const handleClick = stat.href ? () => router.push(stat.href!) : undefined;
        return (
          <div
            key={stat.title}
            onClick={handleClick}
            onKeyDown={
              handleClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleClick();
                    }
                  }
                : undefined
            }
            role={handleClick ? 'button' : undefined}
            tabIndex={handleClick ? 0 : undefined}
            className={`bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs transition-all duration-300 hover:shadow-md ${
              handleClick
                ? 'cursor-pointer hover:-translate-y-1 hover:border-brand-500/40 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-brand-500/40 focus-visible:border-brand-500 outline-none select-none'
                : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-slate-500 text-sm font-medium mb-2">{stat.title}</p>
                <p className="text-3.5xl font-bold tracking-tight text-slate-900 mb-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.iconBg || 'bg-brand-50'}`}>
                <Icon className={`w-6 h-6 ${stat.color || 'text-brand-500'}`} />
              </div>
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.change} from last month</p>
          </div>
        );
      })}
    </div>
  );
}
