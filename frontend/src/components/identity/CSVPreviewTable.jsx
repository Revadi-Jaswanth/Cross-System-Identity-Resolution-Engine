import React from 'react';
import { AlertCircle } from 'lucide-react';

export const CSVPreviewTable = ({ records = [] }) => {
  if (records.length === 0) return null;

  // Render first 100 rows maximum to avoid UI sluggishness
  const previewRows = records.slice(0, 100);

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        File Preview Grid (showing up to 100 rows)
      </h3>
      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft max-h-[300px]">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="sticky top-0 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
            <tr>
              <th className="p-3">Source System</th>
              <th className="p-3">Source Record UID</th>
              <th className="p-3">Org ID</th>
              <th className="p-3">Full Name</th>
              <th className="p-3">Aadhaar ID</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {previewRows.map((rec, index) => {
              const isInvalidAadhaar = rec.attributes?.aadhaar && rec.attributes.aadhaar.length !== 12;
              const isMissingRequired = !rec.system_source || !rec.system_uid || !rec.organization_id || !rec.attributes?.name;

              return (
                <tr 
                  key={index} 
                  className={`hover:bg-slate-50/50 ${
                    isMissingRequired ? 'bg-rose-500/5' : ''
                  }`}
                >
                  <td className="p-3 font-semibold">{rec.system_source || <span className="text-rose-500 font-bold">MISSING</span>}</td>
                  <td className="p-3 font-mono">{rec.system_uid || <span className="text-rose-500 font-bold">MISSING</span>}</td>
                  <td className="p-3">{rec.organization_id || <span className="text-rose-500 font-bold">MISSING</span>}</td>
                  <td className="p-3">{rec.attributes?.name || <span className="text-rose-500 font-bold">MISSING</span>}</td>
                  <td className={`p-3 font-mono ${isInvalidAadhaar ? 'text-rose-500 font-bold underline' : ''}`}>
                    {rec.attributes?.aadhaar || 'N/A'}
                  </td>
                  <td className="p-3">
                    {isMissingRequired || isInvalidAadhaar ? (
                      <span className="flex items-center gap-1 text-[10px] text-rose-500 font-bold uppercase">
                        <AlertCircle size={12} />
                        <span>Invalid</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-500 font-bold uppercase">Valid</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default CSVPreviewTable;
