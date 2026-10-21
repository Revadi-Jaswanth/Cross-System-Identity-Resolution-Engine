import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { History, Eye, Download } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';
import { SearchBar } from '@/components/common/SearchBar';

export const ResolutionHistory = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  const [search, setSearch] = useState('');

  // Fetch Resolution History Logs
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['resolutionHistory', page, limit, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: limit.toString()
      });
      if (search) params.append('search', search);

      const res = await api.get(`/v1/resolution/history?${params.toString()}`);
      return res.data?.data || { items: [], pagination: {} };
    }
  });

  const columns = [
    { 
      header: 'Match Log ID', 
      key: 'id', 
      render: (row) => <span className="font-mono text-xs">#{row.id}</span> 
    },
    { 
      header: 'Target Cluster ID', 
      key: 'target_cluster_id', 
      render: (row) => <span className="font-mono text-xs">{row.target_cluster_id}</span> 
    },
    { header: 'IP Location', key: 'ip_address' },
    { 
      header: 'Created Date', 
      key: 'created_at', 
      render: (row) => <span className="font-mono text-xs">{row.created_at?.slice(0, 19)}</span> 
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          onClick={() => navigate(`/resolution/details`, { state: { cand: { uuid: row.target_cluster_id, score: 95 } } })}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors"
        >
          <Eye size={14} />
        </button>
      )
    }
  ];

  const handleExportCSV = () => {
    const list = historyData?.items || [];
    if (list.length === 0) return;
    
    const headers = ['Log ID', 'Target Cluster ID', 'IP Address', 'Created Date'];
    const rows = list.map(h => [h.id, h.target_cluster_id, h.ip_address, h.created_at]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Resolution_History_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <History className="text-primary-500" size={24} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Resolution Audit Logs
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Inspect historical execution checks.
            </p>
          </div>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
        >
          <Download size={14} />
          <span>Export CSV logs</span>
        </button>
      </div>

      <FilterPanel onReset={() => setSearch('')}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by target cluster id..." />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={historyData?.items || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: historyData?.pagination?.total_pages || 1,
          hasNext: historyData?.pagination?.has_next,
          hasPrev: historyData?.pagination?.has_previous,
          nextPage,
          prevPage
        }}
      />
    </div>
  );
};
export default ResolutionHistory;
