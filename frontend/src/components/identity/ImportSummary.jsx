import React from 'react';
import { CheckCircle2, XCircle, ArrowUpRight } from 'lucide-react';

export const ImportSummary = ({ summary, onReset }) => {
  if (!summary) return null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-6 max-w-lg mx-auto animate-fade-in">
      <div className="text-center">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Import Job Complete</h3>
        <p className="text-xs text-slate-400 mt-1">Summary metrics for the executed bulk ingestion queue.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-premium text-center">
          <div className="inline-flex p-2 bg-emerald-500/15 rounded-full mb-1">
            <CheckCircle2 size={20} />
          </div>
          <p className="text-2xl font-extrabold">{summary.processed}</p>
          <span className="text-[10px] uppercase font-bold tracking-wider">Processed Records</span>
        </div>

        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-center">
          <div className="inline-flex p-2 bg-rose-500/15 rounded-full mb-1">
            <XCircle size={20} />
          </div>
          <p className="text-2xl font-extrabold">{summary.failed}</p>
          <span className="text-[10px] uppercase font-bold tracking-wider">Failed Records</span>
        </div>
      </div>

      {summary.failures?.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Failed Record Logs</h4>
            <button
              type="button"
              onClick={() => {
                const headers = ['Row Index', 'Error Detail'];
                const rows = summary.failures.map(f => [f.index, f.error]);
                const csvContent = "data:text/csv;charset=utf-8," 
                  + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `Failed_Rows_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="text-[10px] font-bold text-rose-500 hover:underline uppercase"
            >
              Export Failed Rows
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-855 border rounded-premium p-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
            {summary.failures.map((fail, idx) => (
              <div key={idx} className="py-1.5 flex justify-between text-rose-600 font-semibold">
                <span>Row Index: {fail.index}</span>
                <span className="max-w-[70%] truncate">{fail.error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-colors uppercase tracking-wider flex items-center justify-center gap-1"
      >
        <span>Upload Another File</span>
        <ArrowUpRight size={16} />
      </button>
    </div>
  );
};
export default ImportSummary;
