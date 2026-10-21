import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft, Fingerprint, Calendar, Building, Cpu, Eye, Lock, ShieldCheck } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const IdentityDetails = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWriteIdentities } = usePermissions();

  // Fetch single Identity Details
  const { data: identity, isLoading, error } = useQuery({
    queryKey: ['identityDetails', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/identities/${uuid}`);
      return res.data?.data || null;
    }
  });

  const softDeleteMutation = useMutation({
    mutationFn: () => api.delete(`/v1/identities/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['identities']);
      navigate('/identities');
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Retrieving decrypted attributes...</span>
      </div>
    );
  }

  if (error || !identity) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load identity record</h3>
        <p className="text-xs mt-1">Make sure the record UUID is valid or check credentials.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 font-mono text-base">
              Record: {identity.uuid}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              Metadata trace lookup parameters.
            </p>
          </div>
        </div>

        {canWriteIdentities && (
          <button
            onClick={() => {
              if (window.confirm("Are you sure you want to soft delete this identity record?")) {
                softDeleteMutation.mutate();
              }
            }}
            disabled={softDeleteMutation.isLoading}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
          >
            Soft Delete Record
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core decrypted attributes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b pb-2 flex items-center gap-1.5">
              <Lock className="text-primary-500" size={16} />
              <span>Decrypted Demographic Data</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">System Source</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{identity.system_source}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">System UID Reference</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{identity.system_uid}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Current Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                  identity.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                }`}>
                  {identity.status}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Record Ingested Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{identity.created_at}</span>
              </div>
            </div>
          </div>

          {/* Verification Logs Timeline */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b pb-2 flex items-center gap-1.5">
              <ShieldCheck size={16} />
              <span>Matching & Verification Audit History</span>
            </h3>
            <div className="space-y-4 pt-2">
              <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2">
                <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-mono text-slate-400 font-semibold">{identity.created_at}</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Resolved and linked to Cluster {identity.cluster_id || 'N/A'}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Applied strategy: exact_hash matches check</p>
              </div>
            </div>
          </div>
        </div>

        {/* Cryptographic properties card sidebar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
            Security Metadata
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Encryption Algorithm</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{identity.encryption_algorithm || 'AES-GCM-256'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Hashing Algorithm</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{identity.hash_algorithm || 'SHA-256'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Row Version Lock</span>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">v{identity.version}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default IdentityDetails;
