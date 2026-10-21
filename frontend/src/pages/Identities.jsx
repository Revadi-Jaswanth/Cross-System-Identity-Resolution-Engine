import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Plus, Upload } from 'lucide-react';

export const Identities = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const columns = [
    { header: 'System Source', key: 'system_source' },
    { header: 'System UID', key: 'system_uid' },
    { header: 'Status', key: 'status', render: (row) => (
      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full font-semibold text-[10px] uppercase">
        {row.status}
      </span>
    )},
    { header: 'Actions', key: 'actions', render: (row) => (
      <button
        onClick={() => navigate(`/identities/${row.uuid}`)}
        className="text-xs font-semibold text-primary-500 hover:text-primary-600 hover:underline"
      >
        View Details
      </button>
    )}
  ];

  const dummyIdentities = [
    { uuid: '11111111-1111-1111-1111-111111111111', system_source: 'AadhaarService', system_uid: 'A1001', status: 'ACTIVE' },
    { uuid: '22222222-2222-2222-2222-222222222222', system_source: 'ABHAService', system_uid: 'AB101', status: 'ACTIVE' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
            Raw Identities Ingestion
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Ingest and examine raw data records from connected source systems.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={() => navigate('/identities/bulk')}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Upload size={16} />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={() => navigate('/identities/register')}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-all shadow-soft"
          >
            <Plus size={16} />
            <span>Ingest Record</span>
          </button>
        </div>
      </div>

      <FilterPanel onReset={() => setSearchQuery('')}>
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search identities by system source or UID..." />
      </FilterPanel>

      <DataTable columns={columns} data={dummyIdentities} />
    </div>
  );
};
export default Identities;
