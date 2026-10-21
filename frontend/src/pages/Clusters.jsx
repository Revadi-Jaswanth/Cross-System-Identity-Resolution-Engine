import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { useDebounce } from '@/hooks/useDebounce';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, RefreshCw, Eye } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { SearchBar } from '@/components/common/SearchBar';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Drawer } from '@/components/common/Drawer';
import MergeWizard from '@/components/cluster/MergeWizard';

export const Clusters = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);

  const [statusFilter, setStatusFilter] = useState('');
  const [mergeWizardOpen, setMergeWizardOpen] = useState(false);

  // Fetch Clusters
  const { data: clustersData, isLoading, refetch } = useQuery({
    queryKey: ['clustersList', page, limit, debouncedSearch, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: limit.toString()
      });
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearch) params.append('search', debouncedSearch);

      const res = await api.get(`/v1/clusters?${params.toString()}`);
      return res.data?.data || { items: [], pagination: {} };
    }
  });

  const columns = [
    { 
      header: 'Cluster UUID', 
      key: 'uuid', 
      render: (row) => <span className="font-mono text-xs font-semibold">{row.uuid}</span> 
    },
    { header: 'Identities Count', key: 'identities_count' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
          row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {row.status}
        </span>
      )
    },
    { header: 'Version Lock', key: 'version', render: (row) => <span className="font-mono">v{row.version}</span> },
    { 
      header: 'Created At', 
      key: 'created_at', 
      render: (row) => <span className="font-mono text-xs">{row.created_at?.slice(0, 10)}</span> 
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/clusters/${row.uuid}`)}
            className="p-1 hover:bg-slate-105 text-slate-500 rounded transition-colors"
          >
            <Eye size={14} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Layers className="text-primary-500" size={24} />
            <span>Identity Clusters</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Browse resolved identity clusters profiles and run manual merges.
          </p>
        </div>

        <div className="flex items-center gap-2 mt-4 sm:mt-0">
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setMergeWizardOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
          >
            <Plus size={14} />
            <span>New Merge Transaction</span>
          </button>
        </div>
      </div>

      <FilterPanel onReset={() => { setSearch(''); setStatusFilter(''); }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search cluster by UUID..." />
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-600 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={clustersData?.items || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: clustersData?.pagination?.total_pages || 1,
          hasNext: clustersData?.pagination?.has_next,
          hasPrev: clustersData?.pagination?.has_previous,
          nextPage,
          prevPage
        }}
      />

      <Drawer isOpen={mergeWizardOpen} onClose={() => setMergeWizardOpen(false)} title="Merge Clusters">
        <MergeWizard onClose={() => setMergeWizardOpen(false)} />
      </Drawer>
    </div>
  );
};
export default Clusters;
