import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, Layers, User, Calendar, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { DataTable } from '@/components/common/DataTable';

export const ClusterDetails = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Fetch cluster details
  const { data: cluster, isLoading, error } = useQuery({
    queryKey: ['clusterDetails', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/clusters/${uuid}`);
      return res.data?.data || null;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Loading cluster detail properties...</span>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load cluster details</h3>
        <p className="text-xs mt-1">Make sure the cluster UUID is correct or check permissions.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  const columns = [
    { 
      header: 'Identity UUID', 
      key: 'uuid', 
      render: (row) => <span className="font-mono text-xs font-semibold">{row.uuid}</span> 
    },
    { header: 'System Source', key: 'system_source' },
    { header: 'System Record ID', key: 'system_uid' },
    { 
      header: 'Status', 
      key: 'status', 
      render: (row) => (
        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
          row.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
              Cluster Parameters inspect
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              UUID: {cluster.uuid}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/clusters/${cluster.uuid}/golden`)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
        >
          View Golden Profile
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core parameters properties */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
              <Layers className="text-primary-500" size={16} />
              <span>Cluster Demographic Summary</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Version Lock</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">v{cluster.version}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Status</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{cluster.status}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Ingested Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{cluster.created_at}</span>
              </div>
            </div>
          </div>

          {/* Nested linked identities lists */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User size={16} />
              <span>Linked Ingested Identities ({cluster.identities?.length})</span>
            </h3>
            <DataTable
              columns={columns}
              data={cluster.identities || []}
            />
          </div>
        </div>

        {/* Sidebar statistics profiles */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
            Statistics Summary
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Conflict Severity Level</span>
              <span className="font-bold text-slate-700 dark:text-slate-350">{cluster.conflict_severity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Resolution Score</span>
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{cluster.resolution_confidence}%</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default ClusterDetails;
