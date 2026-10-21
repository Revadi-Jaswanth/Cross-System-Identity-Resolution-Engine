import React, { useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const CommandPalette = ({ isOpen, onClose, onSearch }) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else onSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, onSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-8 bg-slate-900/60 backdrop-blur-sm animate-fade-in pt-20">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium overflow-hidden">
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none"
            placeholder="Type search command or candidate details lookup..."
            autoFocus
            onChange={(e) => onSearch(e.target.value)}
          />
          <button onClick={onClose} className="text-slate-400 hover:text-slate-500 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 text-xs text-slate-500 border-t bg-slate-50 dark:bg-slate-850 dark:border-slate-800 font-semibold uppercase tracking-wider flex items-center justify-between">
          <span>Global Navigation Palette</span>
          <span>ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
