import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { Terminal, Download, Play, Pause } from 'lucide-react';
import LogsTable from '@/components/system/LogsTable';
import { FilterPanel } from '@/components/common/FilterPanel';

export const LogsViewer = () => {
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  const [severityFilter, setSeverityFilter] = useState('');
  const [isTailing, setIsTailing] = useState(true);

  // Fetch Audit Logs querying resolution history audit log table logs
  const { data: logsData, isLoading } = useQuery({
    queryKey: ['systemLogs', page, limit, severityFilter],
    queryFn: async () => {
      const res = await api.get(`/v1/resolution/history?page=${page}&page_size=${limit}`);
      return res.data?.data || { items: [], pagination: {} };
    },
    refetchInterval: isTailing ? 5000 : false // Live Tail polls every 5s
  });

  const handleExportCSV = () => {
    const list = logsData?.items || [];
    if (list.length === 0) return;
    
    const headers = ['Log ID', 'Target Cluster ID', 'IP Address', 'Created Date'];
    const rows = list.map(l => [l.id, l.target_cluster_id, l.ip_address, l.created_at]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `System_Logs_Export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Terminal className="text-primary-500" size={24} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              System Traces Viewer
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Live tail application logging parameters.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTailing(!isTailing)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-premium text-xs font-semibold hover:bg-slate-50 transition-colors uppercase tracking-wider ${
              isTailing ? 'text-emerald-500 font-bold border-emerald-500/30 bg-emerald-500/5' : 'text-slate-500'
            }`}
          >
            {isTailing ? <Pause size={14} /> : <Play size={14} />}
            <span>{isTailing ? 'Live Tailing' : 'Tailing Paused'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
          >
            <Download size={14} />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      <FilterPanel onReset={() => setSeverityFilter('')}>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-605 focus:outline-none"
        >
          <option value="">All Severities</option>
          <option value="INFO">INFO</option>
          <option value="ERROR">ERROR</option>
        </select>
      </FilterPanel>

      <LogsTable logs={logsData?.items || []} />
    </div>
  );
};
export default LogsViewer;
