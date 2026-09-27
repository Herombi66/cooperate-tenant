import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatsCardProps {
  title: string;
  value: string;
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'yellow' | 'purple' | 'gold' | 'orange';
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  description?: string;
  comparison?: string;
  className?: string;
}

const getLegacyIconColorClass = (color?: string) => {
  switch (color) {
    case 'yellow':
    case 'orange':
      // Semantic pending / attention status
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40';
    case 'green':
      // Semantic success status or primary financial metric
      return 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/40';
    default:
      // Standard professional brand metric
      return 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200/50 dark:border-primary-800/40';
  }
};

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  color = 'blue',
  trend,
  description,
  comparison,
  className,
}) => {
  // Clean, rebalanced financial card layout without decorative icons (FMCKSMCS standard)
  if (!Icon) {
    const contextText =
      description ||
      comparison ||
      (trend
        ? trend.isPositive
          ? 'Increase vs last period'
          : 'Decrease vs last period'
        : undefined);

    return (
      <div
        data-testid="stats-card-no-icon"
        className={cn(
          "group bg-card text-card-foreground rounded-xl shadow-sm border border-border/80 dark:border-border p-6",
          "hover:border-primary-500/40 hover:shadow-md transition-all duration-200",
          "flex flex-col justify-between min-h-[136px]",
          className
        )}
      >
        {/* Top: Metric Title & Trend Percentage Indicator */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </p>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold tabular-nums shrink-0",
                trend.isPositive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/60 dark:border-rose-800/40"
              )}
            >
              {trend.isPositive ? '+' : '-'}{trend.value}%
            </span>
          )}
        </div>

        {/* Center: Prominent Value */}
        <div className="mt-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-none">
            {value}
          </p>
        </div>

        {/* Bottom: Context / Description / Comparison */}
        {contextText && (
          <div className="mt-3 pt-2.5 border-t border-border/50 dark:border-border/40 flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate">{contextText}</span>
            {trend?.label && (
              <span className="shrink-0 text-muted-foreground/80 ml-2">
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Legacy layout with icon (for non-FMCK tenants / pages)
  return (
    <div
      data-testid="stats-card-with-icon"
      className={cn(
        "bg-card text-card-foreground rounded-xl shadow-sm border border-border p-6 transition-all",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {trend && (
            <div className="flex items-center mt-2">
              {trend.isPositive ? (
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400 mr-1" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {trend.value}%
              </span>
            </div>
          )}
        </div>
        <div
          className={`w-12 h-12 ${getLegacyIconColorClass(
            color
          )} rounded-xl flex items-center justify-center flex-shrink-0`}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};