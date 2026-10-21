import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { ArrowLeft, User, Shield, Building, Clock, Activity } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';

export const UserDetails = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();

  // Fetch User Details
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['userDetails', uuid],
    queryFn: async () => {
      const res = await api.get(`/v1/users/${uuid}`);
      return res.data?.data || null;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" className="mb-2" />
        <span className="text-sm text-slate-500">Loading user profile details...</span>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="text-center p-8 text-rose-500">
        <h3 className="text-lg font-bold">Failed to load user details</h3>
        <p className="text-xs mt-1">Make sure the user UUID is correct or check permissions.</p>
        <button onClick={() => navigate(-1)} className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded font-semibold">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-105">
            Operator Profile Details
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            UUID: {user.uuid}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 border-b pb-2">
              Operator Demographic Properties
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <User className="text-slate-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Username</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.username}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building className="text-slate-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Organization ID Scope</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{user.organization_id}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Shield className="text-slate-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">MFA Security</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                    user.mfa_enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {user.mfa_enabled ? 'ENABLED' : 'DISABLED'}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="text-slate-400 mt-0.5" size={18} />
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Created Date</p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {user.created_at || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Activity log timeline mockup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 border-b pb-2 flex items-center gap-1.5">
              <Activity size={16} />
              <span>Activity Timeline</span>
            </h3>
            <div className="space-y-4">
              <div className="relative pl-6 border-l border-slate-200 dark:border-slate-800 pb-2">
                <div className="absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary-500" />
                <span className="text-[10px] font-mono text-slate-400 font-semibold">2026-07-10 14:50:00</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Session login authenticated successfully</p>
                <p className="text-[10px] text-slate-500 mt-0.5">IP Address: 127.0.0.1 • User-Agent: Chrome Console Browser Node</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar credentials breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 h-fit space-y-6">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Roles</h3>
            <div className="flex flex-wrap gap-1.5">
              {user.roles?.map((r, i) => (
                <span key={i} className="px-2.5 py-0.5 bg-primary-500/10 text-primary-500 rounded-full font-bold text-[9px] uppercase">
                  {r}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">RBAC Claims Assigned</h3>
            <div className="flex flex-wrap gap-1.5">
              {user.permissions?.map((p, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded font-semibold text-[9px] uppercase">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default UserDetails;
