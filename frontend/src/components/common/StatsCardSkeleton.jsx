import React from 'react';

export const StatsCardSkeleton = () => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft flex items-start justify-between animate-pulse">
      <div className="flex flex-col grow">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 w-24 rounded-md mb-2" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 w-16 rounded-md mb-2" />
        <div className="h-3 bg-slate-100 dark:bg-slate-800 w-32 rounded-md" />
      </div>
      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-premium" />
    </div>
  );
};
export default StatsCardSkeleton;
