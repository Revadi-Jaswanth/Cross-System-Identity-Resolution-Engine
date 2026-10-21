import React from 'react';
import { X, RefreshCw } from 'lucide-react';

export const UploadProgressDialog = ({ isOpen, progress, total, onCancel }) => {
  if (!isOpen) return null;

  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">Ingesting Records Queue</span>
          <span className="text-xs text-primary-500 font-semibold">{percent}%</span>
        </div>
        
        <div className="space-y-2">
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary-600 rounded-full transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-center">
            Processed <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{progress}</span> of{' '}
            <span className="font-bold text-slate-700 dark:text-slate-300 dark:text-slate-300">{total}</span> records.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="w-full py-2 border rounded-premium text-xs font-semibold text-rose-500 hover:bg-rose-50/50 transition-colors uppercase tracking-wider flex items-center justify-center gap-1.5"
        >
          <X size={14} />
          <span>Cancel Upload</span>
        </button>
      </div>
    </div>
  );
};
export default UploadProgressDialog;
