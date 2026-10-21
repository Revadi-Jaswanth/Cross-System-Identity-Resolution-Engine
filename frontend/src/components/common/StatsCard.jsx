import React from 'react';

export const StatsCard = ({ title, value, icon, description = null, trend = null, className = '' }) => {
  return (
    <div className={`p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft flex items-start justify-between ${className}`}>
      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{title}</span>
        <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 mb-2">{value}</span>
        {description && (
          <div className="flex items-center gap-1.5 text-xs">
            {trend && (
              <span className={`font-semibold ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                {trend.value}
              </span>
            )}
            <span className="text-slate-400 dark:text-slate-500">{description}</span>
          </div>
        )}
      </div>
      <div className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-500 dark:text-slate-400 rounded-premium shadow-sm shrink-0">
        {icon}
      </div>
    </div>
  );
};
