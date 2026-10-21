import React, { useState } from 'react';
import { Terminal, AlertTriangle, Info } from 'lucide-react';

export const LogsTable = ({ logs = [] }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 border border-dashed rounded bg-slate-50 dark:bg-slate-900">
        No log entries captured. Choose options to verify.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft max-h-[400px]">
      <table className="w-full text-left border-collapse text-xs font-mono">
        <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
          <tr>
            <th className="p-3 w-[15%]">Timestamp</th>
            <th className="p-3 w-[10%]">Severity</th>
            <th className="p-3 w-[60%]">Log message / Stack trace</th>
            <th className="p-3 w-[15%]">IP Address</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {logs.map((log) => {
            const isError = log.details?.error || log.details?.code === 'FORBIDDEN';

            return (
              <React.Fragment key={log.id}>
                <tr 
                  className={`hover:bg-slate-50/50 cursor-pointer ${
                    isError ? 'bg-rose-500/5 text-rose-600' : ''
                  }`}
                  onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                >
                  <td className="p-3 truncate">{log.created_at?.slice(11, 19)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                      isError ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {isError ? 'ERROR' : 'INFO'}
                    </span>
                  </td>
                  <td className="p-3 truncate max-w-lg">{JSON.stringify(log.details)}</td>
                  <td className="p-3 font-semibold">{log.ip_address}</td>
                </tr>

                {expandedId === log.id && (
                  <tr className="bg-slate-50 dark:bg-slate-950">
                    <td colSpan={4} className="p-4 border-t border-b dark:border-slate-850 text-[10px] space-y-2">
                      <p className="font-bold uppercase text-slate-400">Full Trace Payload</p>
                      <pre className="whitespace-pre-wrap font-mono p-3 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default LogsTable;
