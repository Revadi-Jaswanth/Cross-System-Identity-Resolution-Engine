import React, { useState } from 'react';
import { ToggleLeft, ToggleRight, ShieldAlert, Search } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';

export const FeatureFlags = () => {
  const [search, setSearch] = useState('');
  const [flags, setFlags] = useState([
    { key: 'exact_match_priority', name: 'Exact Match Priority', desc: 'Runs exact hash checks before evaluating fuzzy attributes.', status: 'ENABLED', env: 'Production', author: 'Super Admin' },
    { key: 'rapidfuzz_caching', name: 'RapidFuzz Caching', desc: 'Cache parsed fuzzy tokens in redis cluster.', status: 'DISABLED', env: 'Production', author: 'Super Admin' },
    { key: 'mfa_enforcement', name: 'MFA Enforcement', desc: 'Block logins missing MFA configuration.', status: 'ENABLED', env: 'Production', author: 'Super Admin' }
  ]);

  const toggleFlag = (key) => {
    setFlags(prev =>
      prev.map(f => f.key === key ? { ...f, status: f.status === 'ENABLED' ? 'DISABLED' : 'ENABLED' } : f)
    );
  };

  const columns = [
    { header: 'Feature Toggle Name', key: 'name', render: (row) => <span className="font-semibold">{row.name}</span> },
    { header: 'Description', key: 'desc' },
    { header: 'Environment', key: 'env' },
    { header: 'Modified By', key: 'author' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
          row.status === 'ENABLED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          onClick={() => toggleFlag(row.key)}
          className={`p-1.5 rounded transition-colors ${
            row.status === 'ENABLED' ? 'text-primary-500 hover:bg-primary-50' : 'text-slate-400 hover:bg-slate-100'
          }`}
        >
          {row.status === 'ENABLED' ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
        </button>
      )
    }
  ];

  const filteredFlags = flags.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="text-primary-500" size={24} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Feature Flags Console
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Enable or disable service capabilities immediately.
            </p>
          </div>
        </div>
      </div>

      <FilterPanel onReset={() => setSearch('')}>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search features..."
            className="w-full pl-9 pr-4 py-2 border rounded-premium text-xs bg-white dark:bg-slate-905 dark:border-slate-800 text-slate-700 focus:outline-none"
          />
        </div>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={filteredFlags}
      />
    </div>
  );
};
export default FeatureFlags;
