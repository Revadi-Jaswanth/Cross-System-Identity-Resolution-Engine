import React from 'react';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

export const VerificationTimeline = ({ status = 'PENDING', date = '' }) => {
  return (
    <div className="space-y-4 pt-2">
      <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2">
        <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-500" />
        <span className="text-[10px] font-mono text-slate-400 font-semibold">{date || '2026-07-10 12:00'}</span>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Verification Request Initiated</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Triggered by operator matching checks</p>
      </div>

      <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2">
        <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ${
          status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-amber-500'
        }`} />
        <span className="text-[10px] font-mono text-slate-400 font-semibold">{date || '2026-07-10 12:01'}</span>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
          Resolution Match: {status}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">Evaluated against existing clusters</p>
      </div>
    </div>
  );
};
export default VerificationTimeline;
