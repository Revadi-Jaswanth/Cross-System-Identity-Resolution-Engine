import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Plus, RefreshCw, Eye } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { FilterPanel } from '@/components/common/FilterPanel';
import { Drawer } from '@/components/common/Drawer';
import VerificationWizard from '@/components/verification/VerificationWizard';

export const Verification = () => {
  const navigate = useNavigate();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  const [statusFilter, setStatusFilter] = useState('');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Fetch Verification Requests
  const { data: verificationsData, isLoading, refetch } = useQuery({
    queryKey: ['verificationHistory', page, limit, statusFilter],
    queryFn: async () => {
      const res = await api.get(`/v1/verification/history?page=${page}&page_size=${limit}`);
      return res.data?.data || { items: [], pagination: {} };
    }
  });

  const columns = [
    { 
      header: 'Request UUID', 
      key: 'uuid', 
      render: (row) => <span className="font-mono text-xs font-semibold">{row.uuid}</span> 
    },
    { header: 'Organization ID', key: 'organization_id' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
          row.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {row.status}
        </span>
      )
    },
    { 
      header: 'Requested At', 
      key: 'created_at', 
      render: (row) => <span className="font-mono text-xs">{row.created_at?.slice(0, 10)}</span> 
    },
    {
      header: 'Actions',
      key: 'actions',
      render: (row) => (
        <button
          onClick={() => navigate(`/verification/requests/${row.uuid}`)}
          className="p-1 hover:bg-slate-105 text-slate-500 rounded transition-colors"
        >
          <Eye size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <ShieldCheck className="text-primary-500" size={24} />
            <span>Verification Desk</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Evaluate SLA verification requests.
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
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
          >
            <Plus size={14} />
            <span>Process Verification</span>
          </button>
        </div>
      </div>

      <FilterPanel onReset={() => setStatusFilter('')}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 border border-slate-250 dark:border-slate-800 rounded-premium bg-white dark:bg-slate-900 text-xs text-slate-600 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={verificationsData?.items || []}
        loading={isLoading}
        pagination={{
          page,
          limit,
          totalPages: verificationsData?.pagination?.total_pages || 1,
          hasNext: verificationsData?.pagination?.has_next,
          hasPrev: verificationsData?.pagination?.has_previous,
          nextPage,
          prevPage
        }}
      />

      <Drawer isOpen={wizardOpen} onClose={() => setWizardOpen(false)} title="Verify Identity Request">
        <VerificationWizard onClose={() => setWizardOpen(false)} />
      </Drawer>
    </div>
  );
};
export default Verification;
