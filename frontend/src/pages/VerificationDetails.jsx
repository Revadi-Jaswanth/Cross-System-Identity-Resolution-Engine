import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, Clock, ShieldAlert, Award, FileText } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import VerificationTimeline from '@/components/verification/VerificationTimeline';

export const VerificationDetails = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Fetch Verification Details
  const { data: request, isLoading, error } = useQuery({
    queryKey: ['verificationDetails', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/verification/requests/${uuid}`);
      return res.data?.data || null;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Retrieving verification metadata...</span>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load verification details</h3>
        <p className="text-xs mt-1">Make sure request UUID is correct or check credentials.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  const result = request.results?.[0] || {};

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
              Verification: {request.uuid}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              SLA tracking logs details.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Clock className="text-slate-400" size={16} />
          <span className="text-xs text-slate-400 font-semibold">SLA:</span>
          <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded font-bold text-xs">
            Within SLA limits
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core parameters properties */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
              <FileText className="text-primary-500" size={16} />
              <span>Incoming Identity Attributes</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Organization Scope</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{request.organization_id}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Submitted By Operator</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">ID: {request.requested_by}</span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Current Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                  request.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {request.status}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold text-slate-400 uppercase">Created Date</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">{request.created_at}</span>
              </div>
            </div>
          </div>

          {/* Verification matching timelines logs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b pb-2 flex items-center gap-1.5">
              <Award className="text-primary-500" size={16} />
              <span>Verification Resolution Timeline</span>
            </h3>
            <VerificationTimeline status={request.status} date={request.created_at} />
          </div>
        </div>

        {/* Sidebar statistics properties */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft h-fit space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b pb-2">
            Verification Outcome
          </h3>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Matched Cluster ID</span>
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{result.matched_cluster_id || 'None (New)'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">Match Score</span>
              <span className="font-bold text-slate-700 dark:text-slate-350 font-mono">{result.match_score || 0.0}%</span>
            </div>
            <div className="flex justify-between items-center font-bold">
              <span className="text-slate-500 font-semibold">Matched Fields</span>
              <span className="text-slate-750 truncate max-w-[50%]">{result.matched_attributes || 'None'}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default VerificationDetails;
