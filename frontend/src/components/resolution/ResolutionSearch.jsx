import React, { useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';

export const ResolutionSearch = ({ onSearch, onReset }) => {
  const [val, setVal] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(val);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap items-center">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Input search candidate details..."
          className="w-full pl-9 pr-4 py-2 border rounded-premium text-xs bg-white dark:bg-slate-905 dark:border-slate-800 text-slate-700 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
      >
        Search
      </button>

      <button
        type="button"
        onClick={() => { setVal(''); onReset(); }}
        className="p-2 border rounded-premium bg-white dark:bg-slate-905 dark:border-slate-800 text-slate-500 hover:bg-slate-50 transition-colors"
      >
        <RotateCcw size={14} />
      </button>
    </form>
  );
};
export default ResolutionSearch;
