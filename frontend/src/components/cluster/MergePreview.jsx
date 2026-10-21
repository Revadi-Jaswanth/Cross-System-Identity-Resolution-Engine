import React from 'react';
import { ArrowRight, Check } from 'lucide-react';

export const MergePreview = ({ sourceProfile = {}, targetProfile = {}, resultProfile = {} }) => {
  const fields = [
    { key: 'name', label: 'Full Name' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'address', label: 'Address' },
    { key: 'aadhaar', label: 'Aadhaar ID' },
    { key: 'email', label: 'Email' }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Golden Profile Impact Preview Analysis
      </h3>

      <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="p-3 w-[25%]">Field Parameter</th>
              <th className="p-3 w-[25%]">Source Cluster Profile</th>
              <th className="p-3 w-[25%]">Target Cluster Profile</th>
              <th className="p-3 w-[25%]">Resulting Golden Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
            {fields.map((field) => {
              const srcVal = sourceProfile[field.key] || 'N/A';
              const tgtVal = targetProfile[field.key] || 'N/A';
              const resVal = resultProfile[field.key] || 'N/A';
              const isChanged = resVal !== tgtVal;

              return (
                <tr key={field.key} className={isChanged ? 'bg-amber-500/5' : ''}>
                  <td className="p-3 font-bold text-[10px] uppercase text-slate-400">{field.label}</td>
                  <td className="p-3">{srcVal}</td>
                  <td className="p-3">{tgtVal}</td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span>{resVal}</span>
                    {isChanged && (
                      <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 rounded font-bold text-[9px] uppercase">
                        Modified
                      </span>
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
export default MergePreview;
