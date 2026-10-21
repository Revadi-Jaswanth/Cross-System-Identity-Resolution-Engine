import React from 'react';
import { X, AlertTriangle, ArrowRight } from 'lucide-react';

export const MergePreviewDialog = ({ isOpen, onClose, onConfirm, sourceRecord = {}, targetCluster = {} }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <AlertTriangle className="text-amber-500" size={18} />
            <span>Confirm Cluster Merge Operation</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium flex items-start gap-2">
            <AlertTriangle className="shrink-0 mt-0.5" size={16} />
            <div>
              <p className="font-bold">Rollback warning details</p>
              <p className="mt-0.5">
                Merging this raw record into the target cluster will modify the active Golden Profile immediately.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Source Profile Name</span>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{sourceRecord.attributes?.name || 'Incoming Record'}</span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400">Target Profile Name</span>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{targetCluster.name || 'Existing Cluster Profile'}</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-4 border dark:border-slate-850 rounded-premium space-y-2">
            <h4 className="font-bold text-slate-800 dark:text-slate-300">Golden Profile Impact Analysis</h4>
            <div className="flex items-center justify-between">
              <span>Proposed Cluster ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{targetCluster.uuid || 'CL-991'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Risk Assessment Level:</span>
              <span className="font-bold text-emerald-500">LOW (No demographic contradictions)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-premium font-semibold text-slate-500 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-premium transition-colors flex items-center gap-1.5"
          >
            <span>Proceed with Merge</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
export default MergePreviewDialog;
