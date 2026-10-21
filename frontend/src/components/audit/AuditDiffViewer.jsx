import React from 'react';

export const AuditDiffViewer = ({ before = {}, after = {} }) => {
  const keys = Object.keys({ ...before, ...after });

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft overflow-hidden text-xs">
      <div className="grid grid-cols-3 bg-slate-50 dark:bg-slate-850 p-3 border-b font-semibold uppercase text-[10px] tracking-wider text-slate-500">
        <span>Field Parameter</span>
        <span>Original Value</span>
        <span>Updated Value</span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {keys.map((key) => {
          const val1 = before[key] || 'N/A';
          const val2 = after[key] || 'N/A';
          const isChanged = val1 !== val2;

          return (
            <div 
              key={key} 
              className={`grid grid-cols-3 p-3 font-mono ${
                isChanged ? 'bg-amber-500/5' : ''
              }`}
            >
              <span className="font-bold text-slate-700 dark:text-slate-400">{key}</span>
              <span className="text-slate-500 line-through">{JSON.stringify(val1)}</span>
              <span className={`font-semibold ${isChanged ? 'text-amber-600 underline' : 'text-slate-750'}`}>
                {JSON.stringify(val2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default AuditDiffViewer;
