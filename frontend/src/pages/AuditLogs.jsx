import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { History, Eye, Download } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';
import { SearchBar } from '@/components/common/SearchBar';
import { Drawer } from '@/components/common/Drawer';
import AuditTimeline from '@/components/audit/AuditTimeline';
import AuditDiffViewer from '@/components/audit/AuditDiffViewer';

export const AuditLogs = () => {
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  const [search, setSearch] = useState('');
  
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch Audit Logs querying resolution history audit log table logs
  const { data: auditData, isLoading } = useQuery({
    queryKey: ['auditLogs', page, limit, search],
    queryFn: async () => {
      // Connect to resolution history that checks matching audits log table
      const res = await api.get(`/v1/resolution/history?page=${page}&page_size=${limit}`);
      return res.data?.data || { items: [], pagination: {} };
    }
  });

  const columns = [
    { 
      header: 'Log ID', 
      key: 'id', 
      render: (row) => <span className="font-mono text-xs font-semibold">#{row.id}</span> 
    },
    { 
      header: 'Target Cluster UUID', 
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
          onClick={() => { setSelectedLog(row); setDrawerOpen(true); }}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded transition-colors"
        >
          <Eye size={14} />
        </button>
      )
    }
  ];

  const handleExportCSV = () => {
    const list = auditData?.items || [];
    if (list.length === 0) return;
    
    const headers = ['Log ID', 'Target Cluster ID', 'IP Address', 'Created Date'];
    const rows = list.map(a => [a.id, a.target_cluster_id, a.ip_address, a.created_at]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Audit_Logs_Export_${Date.now()}.csv`);
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
              System Audit Trails
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Query historical modifications and operator actions logs.
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
        <SearchBar value={search} onChange={setSearch} placeholder="Search by target cluster..." />
      </FilterPanel>

      <DataTable
        columns={columns}
        data={auditData?.items || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: auditData?.pagination?.total_pages || 1,
          hasNext: auditData?.pagination?.has_next,
          hasPrev: auditData?.pagination?.has_previous,
          nextPage,
          prevPage
        }}
      />

      <Drawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} title="Audit Event Parameters">
        {selectedLog && (
          <div className="space-y-6 text-xs text-slate-600 dark:text-slate-400">
            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Audit Type Action</span>
              <span className="font-bold text-sm text-slate-700 dark:text-slate-200">MATCH_RESOLVED</span>
            </div>

            <AuditTimeline items={[selectedLog]} />

            <div>
              <span className="block text-[10px] uppercase font-bold text-slate-400 mb-3">Database Changes Diff</span>
              <AuditDiffViewer
                before={{ status: 'PENDING', confidence: '80%' }}
                after={{ status: 'COMPLETED', confidence: '95%' }}
              />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
export default AuditLogs;
