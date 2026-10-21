import React from 'react';
import { Filter } from 'lucide-react';

export const FilterPanel = ({ children, onReset = null }) => {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft w-full">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider shrink-0">
        <Filter size={16} />
        <span>Filters</span>
      </div>
      <div className="flex flex-wrap items-center gap-3 grow">
        {children}
      </div>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs font-semibold text-primary-500 hover:text-primary-600 transition-colors uppercase tracking-wider shrink-0"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
};
