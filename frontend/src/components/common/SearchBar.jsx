import React from 'react';
import { Search } from 'lucide-react';

export const SearchBar = ({ value, onChange, placeholder = 'Search logs, users, records...' }) => {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
        <Search size={18} />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 dark:text-slate-100 placeholder-slate-400 transition-colors"
      />
    </div>
  );
};
