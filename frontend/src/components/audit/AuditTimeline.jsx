import React from 'react';

export const AuditTimeline = ({ items = [] }) => {
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-slate-400 border border-dashed rounded bg-slate-50 dark:bg-slate-900">
        No audit events recorded.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((log) => (
        <div key={log.id} className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2">
          <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-500" />
          <span className="text-[10px] font-mono text-slate-400 font-semibold">{log.created_at?.slice(0, 19)}</span>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">{log.action}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">IP Address: {log.ip_address || '127.0.0.1'}</p>
          {log.details && (
            <div className="mt-2 p-2 bg-slate-50 dark:bg-slate-950 border dark:border-slate-850 rounded text-[10px] font-mono">
              {JSON.stringify(log.details)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
export default AuditTimeline;
