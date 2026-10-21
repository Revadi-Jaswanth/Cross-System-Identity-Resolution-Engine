import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const DuplicatePreviewModal = ({ isOpen, onClose, onConfirm, duplicates = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium overflow-hidden transition-all transform scale-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-base">
            <AlertTriangle className="text-amber-500" size={18} />
            <span>Duplicate Records Warnings</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400 space-y-3">
          <p>
            We detected <span className="font-bold text-amber-600">{duplicates.length} duplicate record IDs</span> inside this file.
          </p>
          <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-850 border rounded-premium p-2 text-xs font-mono bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
            {duplicates.map((dup, idx) => (
              <div key={idx} className="py-1">
                UID: {dup.system_uid} (Source: {dup.system_source})
              </div>
            ))}
          </div>
          <p className="text-xs">
            Proceeding will overwrite or skip these records based on database constraints. Do you want to continue?
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium text-sm font-semibold text-slate-500 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-premium transition-colors"
          >
            Continue Import
          </button>
        </div>
      </div>
    </div>
  );
};
export default DuplicatePreviewModal;
