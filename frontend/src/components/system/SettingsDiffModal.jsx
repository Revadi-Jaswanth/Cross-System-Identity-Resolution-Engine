import React from 'react';
import { X, AlertCircle } from 'lucide-react';

export const SettingsDiffModal = ({ isOpen, onClose, onConfirm, beforeSettings = [], afterSettings = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 text-sm uppercase">
            <AlertCircle className="text-amber-500" size={16} />
            <span>Confirm Configurations Updates</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-400">
          <p>Please review configuration changes before submitting database updates:</p>
          
          <div className="border border-slate-200 dark:border-slate-800 rounded-premium overflow-hidden bg-slate-50 dark:bg-slate-950 font-mono p-3 space-y-2 max-h-40 overflow-y-auto">
            {afterSettings.map((item, idx) => {
              const prev = beforeSettings.find(s => s.setting_key === item.setting_key) || {};
              if (prev.setting_value === item.setting_value) return null;

              return (
                <div key={idx} className="py-1 border-b dark:border-slate-900 last:border-0">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{item.setting_key}</p>
                  <p className="text-rose-500 line-through mt-0.5">- Original: {prev.setting_value}</p>
                  <p className="text-emerald-500 mt-0.5">+ Updated: {item.setting_value}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-premium font-semibold text-slate-505 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors text-xs"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-premium transition-colors text-xs uppercase tracking-wider"
          >
            Submit Updates
          </button>
        </div>
      </div>
    </div>
  );
};
export default SettingsDiffModal;
