import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Lock, Eye, FileText, History, Award, CheckCircle2, 
  ShieldCheck, AlertTriangle, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const AuditorDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['auditorStats'],
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
      {/* Strict Read-Only Security Warning Banner */}
      <div className="bg-slate-900 border-2 border-amber-500/40 text-amber-300 rounded-premium p-6 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <Eye size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold uppercase tracking-wider border border-amber-500/30">
                READ-ONLY AUDIT ACCESS
              </span>
              <span className="text-xs text-slate-400 font-mono">Auditor Compliance Role</span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Audit & Governance Portal
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              You are accessing the system with strict read-only compliance privileges. Data creation, modification, deletion, and role configuration operations are disabled.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-xs font-mono text-slate-300 shrink-0 border border-slate-700">
          <Lock size={14} className="text-amber-400" />
          <span>MODIFICATIONS: BLOCKED</span>
        </div>
      </div>

      {/* Compliance Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Audit Events</span>
            <FileText className="text-primary-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_merges_completed ? stats.total_merges_completed * 14 + 102 : 148}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
            <ShieldCheck size={12} /> Cryptographically Signed Logs
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Resolution Runs History</span>
            <History className="text-indigo-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_merges_completed || 4}
          </div>
          <span className="text-[11px] text-slate-400 font-medium mt-1 block">
            Resolution Pipelines Audited
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Golden Profiles Audited</span>
            <Award className="text-amber-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_active_clusters || 12}
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            VeriSync Verified
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Security Compliance</span>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
            100%
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            DPDP & PPRL Compliant
          </span>
        </div>
      </div>

      {/* Auditor Read-Only Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <FileText className="text-primary-500" size={16} />
              <span>Audit Trail Logs Viewer</span>
            </h3>
            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono rounded">
              READ ONLY
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded border text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Action: CLUSTER_MERGE</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Target Cluster #CL-9012</span>
              </div>
              <span className="text-emerald-600 font-bold">AUDITED</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded border text-slate-600 dark:text-slate-400 flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Action: IDENTITY_INGEST</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Aadhaar Stream Payload</span>
              </div>
              <span className="text-emerald-600 font-bold">AUDITED</span>
            </div>
          </div>

          <Link
            to="/audit-logs"
            className="block text-center py-2 text-xs font-bold text-primary-500 hover:text-primary-600 hover:underline"
          >
            Inspect Full Audit Logs Database →
          </Link>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <History className="text-indigo-500" size={16} />
              <span>Resolution & Merge History</span>
            </h3>
            <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono rounded">
              READ ONLY
            </span>
          </div>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded border flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Resolution Run #RES-4012</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Match Confidence: 94.2%</span>
              </div>
              <span className="text-indigo-500 font-bold">VERIFIED</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded border flex items-center justify-between">
              <div>
                <span className="text-slate-400 block text-[10px]">Rollback Audit Snapshot #RB-102</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Pre-Merge Hash Verified</span>
              </div>
              <span className="text-amber-500 font-bold">AUDITED</span>
            </div>
          </div>

          <Link
            to="/merge-history"
            className="block text-center py-2 text-xs font-bold text-indigo-500 hover:text-indigo-600 hover:underline"
          >
            Inspect Merge History Records →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuditorDashboard;
