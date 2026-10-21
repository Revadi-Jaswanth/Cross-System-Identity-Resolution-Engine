import React from 'react';

export const ResolutionFilters = ({ status, setStatus, org, setOrg, threshold, setThreshold }) => {
  return (
    <div className="flex gap-2 flex-wrap items-center">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="p-2 border rounded-premium bg-white dark:bg-slate-905 dark:border-slate-800 text-xs text-slate-600 focus:outline-none"
      >
        <option value="">All Statuses</option>
        <option value="ACTIVE">ACTIVE</option>
        <option value="INACTIVE">INACTIVE</option>
      </select>

      <select
        value={org}
        onChange={(e) => setOrg(e.target.value)}
        className="p-2 border rounded-premium bg-white dark:bg-slate-905 dark:border-slate-800 text-xs text-slate-600 focus:outline-none"
      >
        <option value="">All Organizations</option>
        <option value="1">Org 1</option>
        <option value="2">Org 2</option>
      </select>

      <input
        type="number"
        min="0"
        max="100"
        value={threshold}
        onChange={(e) => setThreshold(e.target.value)}
        className="p-2 w-28 border rounded-premium bg-white dark:bg-slate-905 dark:border-slate-800 text-xs text-slate-600 focus:outline-none"
        placeholder="Threshold %"
      />
    </div>
  );
};
export default ResolutionFilters;
