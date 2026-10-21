import React from 'react';
import { X, HelpCircle } from 'lucide-react';

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This operation is irreversible. Do you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  loading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium overflow-hidden transition-all transform scale-100">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-base">
            <HelpCircle className="text-primary-500" size={20} />
            <span>{title}</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6 text-sm text-slate-600 dark:text-slate-400">
          {message}
        </div>
        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium text-sm rounded-premium disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
