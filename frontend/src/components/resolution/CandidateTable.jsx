import React from 'react';
import { Eye, Pin, GitMerge } from 'lucide-react';

export const CandidateTable = ({ candidates = [], onPin, onCompare, onMerge, pinnedIds = [] }) => {
  if (candidates.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 border border-dashed rounded-premium bg-slate-50 dark:bg-slate-900 dark:border-slate-800">
        No candidate matches resolved. Enter parameters above to evaluate.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
            <th className="p-3">Candidate ID</th>
            <th className="p-3">Source System</th>
            <th className="p-3">Matching Score</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
          {candidates.map((cand) => {
            const isPinned = pinnedIds.includes(cand.id);

            return (
              <tr key={cand.id} className="hover:bg-slate-50/50">
                <td className="p-3 font-mono font-semibold">{cand.uuid || cand.id}</td>
                <td className="p-3">{cand.system_source || 'AadhaarService'}</td>
                <td className="p-3">
                  <span className={`font-bold font-mono ${
                    (cand.score || 85) >= 85 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {cand.score || 85}%
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold text-[9px] uppercase">
                    {cand.status || 'ACTIVE'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => onPin(cand.id)}
                      className={`p-1 rounded transition-colors ${
                        isPinned ? 'bg-primary-500/10 text-primary-500 font-bold' : 'text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      <Pin size={14} />
                    </button>
                    <button
                      onClick={() => onCompare(cand)}
                      className="p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => onMerge(cand)}
                      className="p-1 text-amber-500 hover:bg-amber-50 rounded transition-colors"
                    >
                      <GitMerge size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
export default CandidateTable;
