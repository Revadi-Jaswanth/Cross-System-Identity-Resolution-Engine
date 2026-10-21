import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, Award, Shield, User, HelpCircle, Lock } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import ConflictBadge from '@/components/cluster/ConflictBadge';

export const GoldenProfile = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Fetch Golden Profile
  const { data: cluster, isLoading, error } = useQuery({
    queryKey: ['goldenProfile', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/clusters/${uuid}`);
      return res.data?.data || null;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Resolving dynamic conflicts metrics...</span>
      </div>
    );
  }

  if (error || !cluster) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load Golden Profile</h3>
        <p className="text-xs mt-1">Make sure the cluster UUID is correct or check authorization.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  const gp = cluster.golden_profile || {};

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
              Golden Identity Profile
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Cluster Ref: {cluster.uuid}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Match confidence:</span>
          <span className="px-2.5 py-1 bg-primary-500/10 text-primary-500 rounded font-mono font-bold text-xs">
            {cluster.resolution_confidence}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Resolved Profile */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
              <Award className="text-primary-500" size={16} />
              <span>Resolved Field Attributes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Resolved Full Name</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{gp.name || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Date of Birth</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">{gp.dob || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Gender Scope</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{gp.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Residential Address</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{gp.address || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* conflict resolution indicators */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Resolved Disagreement Conflicts
            </h3>
            <ConflictBadge
              field="Email"
              originalValues={['rajesh@gov.in', 'rajesh.kumar@gov.in']}
              selectedSource="AadhaarService"
              policy="TRUSTED_SOURCE_OVERRIDE"
            />
          </div>
        </div>

        {/* Right Side: Security metadata */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
            <Lock size={14} className="text-primary-500" />
            <span>Algorithm parameters</span>
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Conflict Severity</span>
              <span className="font-bold text-slate-700 dark:text-slate-350">{cluster.conflict_severity}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Identities Linked</span>
              <span className="font-bold text-slate-700 dark:text-slate-350">{cluster.identities?.length}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default GoldenProfile;
