import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePagination } from '@/hooks/usePagination';
import { History, Eye, RotateCcw, AlertTriangle } from 'lucide-react';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmationModal } from '@/components/common/ConfirmationModal';

export const MergeHistory = () => {
  const queryClient = useQueryClient();
  const { page, limit, setPage, nextPage, prevPage } = usePagination(1, 10);
  
  const [rollbackTarget, setRollbackTarget] = useState(null);
  const [rollbackPreviewData, setRollbackPreviewData] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Fetch Merge History
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['mergeHistory', page, limit],
    queryFn: async () => {
      const res = await api.get(`/v1/clusters/merge-history?page=${page}&page_size=${limit}`);
      return res.data?.data || { items: [], pagination: {} };
    }
  });

  const rollbackPreviewMutation = useMutation({
    mutationFn: (historyUuid) => api.post(`/v1/clusters/rollback/${historyUuid}`),
    onSuccess: (res) => {
      setRollbackPreviewData(res.data?.data);
      setConfirmOpen(true);
    }
  });

  const executeRollbackMutation = useMutation({
    mutationFn: () => api.post(`/v1/clusters/rollback/${rollbackTarget.uuid}`, { execute: true }),
    onSuccess: () => {
      queryClient.invalidateQueries(['mergeHistory']);
      queryClient.invalidateQueries(['clustersList']);
      setConfirmOpen(false);
      alert('Merge rollback completed successfully!');
    }
  });

  const handleRollbackPreview = (row) => {
    setRollbackTarget(row);
    rollbackPreviewMutation.mutate(row.uuid);
  };

  const columns = [
    { 
      header: 'Merge ID', 
      key: 'uuid', 
      render: (row) => <span className="font-mono text-xs font-semibold">{row.uuid}</span> 
    },
    { header: 'Source Cluster', key: 'source_cluster_uuid' },
    { header: 'Target Cluster', key: 'destination_cluster_uuid' },
    { header: 'Linked Identities', key: 'merged_identity_count' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
          row.status === 'MERGED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
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
          onClick={() => handleRollbackPreview(row)}
          className="p-1 hover:bg-rose-50 text-rose-500 rounded transition-colors"
        >
          <RotateCcw size={14} />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <History className="text-primary-500" size={24} />
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Merge Transaction Logs
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              View historic cluster merge transactions and request rollbacks.
            </p>
          </div>
        </div>
      </div>

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

      {/* Confirmation modal wrapper */}
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => executeRollbackMutation.mutate()}
        title="Confirm Merge Rollback Transaction"
        message={
          <div className="space-y-3">
            <p>Are you sure you want to rollback this merge?</p>
            {rollbackPreviewData && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded text-xs space-y-1">
                <div className="flex items-center gap-1 font-bold">
                  <AlertTriangle size={14} />
                  <span>Rollback Safety Verification</span>
                </div>
                <p>Status: {rollbackPreviewData.reasons?.[0]}</p>
                <p>Identities to restore: {rollbackPreviewData.identities_to_restore_count}</p>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};
export default MergeHistory;
