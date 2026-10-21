import React from 'react';

export const DataTableSkeleton = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft overflow-hidden animate-pulse">
      <div className="p-4 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 w-48 rounded-md" />
        <div className="h-8 bg-slate-200 dark:bg-slate-700 w-32 rounded-md" />
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800">
            {Array.from({ length: cols }).map((_, idx) => (
              <th key={idx} className="p-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 w-24 rounded-md" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              {Array.from({ length: cols }).map((_, colIdx) => (
                <td key={colIdx} className="p-4">
                  <div className="h-4 bg-slate-100 dark:bg-slate-800 w-20 rounded-md" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
