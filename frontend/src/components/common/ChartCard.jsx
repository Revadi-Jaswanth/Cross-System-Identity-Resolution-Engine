import React from 'react';

export const ChartCard = ({ title, children, actions = null, className = '' }) => {
  return (
    <div className={`p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft flex flex-col ${className}`}>
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="grow w-full min-h-[220px] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};
