import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { useAuth } from '@/hooks/useAuth';
import { 
  Building2, Users, Fingerprint, Award, ShieldAlert, FileText, 
  CheckCircle2, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OrgAdminDashboard = () => {
  const { user, organization } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['orgStats'],
    queryFn: async () => {
      try {
        const res = await api.get('/v1/system/stats');
        return res.data?.data || {};
      } catch (e) {
        return {};
      }
    }
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white rounded-premium p-6 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
              Organization Admin Console
            </span>
            <span className="text-xs text-slate-400 font-mono">Scope: {organization?.name || 'National Identity Portal'}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Department Operations Dashboard
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            Manage organization-level identity records, operators, verification tasks, and compliance reports.
          </p>
        </div>

        <Link
          to="/identities/register"
          className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-2 shrink-0 shadow-soft"
        >
          <Fingerprint size={16} />
          <span>Ingest New Identity</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Department Records</span>
            <Fingerprint className="text-primary-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_active_identities || 28}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 size={12} /> Active Department Scope
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Active Operators</span>
            <Users className="text-indigo-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            4
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Authorized Personnel
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Golden Profiles Linked</span>
            <Award className="text-amber-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_active_clusters || 12}
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            VeriSync Resolved
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Reviews</span>
            <ShieldAlert className="text-rose-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            2
          </div>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            Conflict Alerts Queue
          </span>
        </div>
      </div>

      {/* Quick Action Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b pb-3">
            <span>Department Operator Work Queue</span>
            <Link to="/verification" className="text-xs text-primary-500 hover:underline flex items-center gap-1">
              View All <ArrowRight size={12} />
            </Link>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Conflict Verification Req #VER-9021</span>
                <span className="text-slate-400">Aadhaar vs ABHA Address Discrepancy</span>
              </div>
              <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 font-semibold rounded">Review Needed</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200 block">Bulk Ingestion Batch #BATCH-104</span>
                <span className="text-slate-400">14 Identity Records Processed</span>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 font-semibold rounded">Completed</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between border-b pb-3">
            <span>Organization Controls</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Link to="/identities" className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 rounded-lg border text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
              <Fingerprint size={16} className="text-primary-500" />
              <span>Identity Records</span>
            </Link>
            <Link to="/resolution" className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 rounded-lg border text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
              <Award size={16} className="text-amber-500" />
              <span>Resolution Workspace</span>
            </Link>
            <Link to="/clusters" className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 rounded-lg border text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
              <Building2 size={16} className="text-indigo-500" />
              <span>Golden Profiles</span>
            </Link>
            <Link to="/verification" className="p-3 bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 rounded-lg border text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-2">
              <FileText size={16} className="text-emerald-500" />
              <span>Verification Desk</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgAdminDashboard;
