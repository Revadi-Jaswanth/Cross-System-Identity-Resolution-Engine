import React from 'react';
import { History, FileText } from 'lucide-react';

export const ImportHistoryTable = () => {
  const dummyImports = [
    { filename: 'Aadhaar_Batch_A.csv', date: '2026-07-10 14:05', status: 'COMPLETED', count: 12 },
    { filename: 'ABHA_Updates_B.csv', date: '2026-07-10 14:08', status: 'COMPLETED', count: 8 }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 border-b pb-2">
        <History size={14} />
        <span>Recent Import Job History</span>
      </h3>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="p-3">Import Source File</th>
              <th className="p-3">Job Created At</th>
              <th className="p-3">Records Count</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {dummyImports.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50/50">
                <td className="p-3 font-semibold flex items-center gap-1.5">
                  <FileText size={14} className="text-slate-400" />
                  <span>{item.filename}</span>
                </td>
                <td className="p-3 font-mono">{item.date}</td>
                <td className="p-3 font-bold">{item.count}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full font-bold uppercase text-[9px]">
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default ImportHistoryTable;
