import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ConflictBadge = ({ field = '', originalValues = [], selectedSource = '', policy = '' }) => {
  if (originalValues.length <= 1) return null;

  return (
    <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-premium space-y-2 animate-slide-in">
      <div className="flex items-center gap-1.5 font-bold text-xs">
        <AlertCircle size={14} />
        <span>Disagreement detected on field: <span className="underline">{field}</span></span>
      </div>
      <div className="text-[10px] text-slate-500 space-y-1">
        <p>Original Candidate Values:</p>
        <div className="flex flex-wrap gap-1 font-mono">
          {originalValues.map((v, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border rounded">
              {v}
            </span>
          ))}
        </div>
        <p className="mt-1">
          Resolved using policy: <span className="font-bold font-mono uppercase text-slate-700 dark:text-slate-300">{policy}</span> (Source: <span className="font-semibold">{selectedSource}</span>)
        </p>
      </div>
    </div>
  );
};
export default ConflictBadge;
