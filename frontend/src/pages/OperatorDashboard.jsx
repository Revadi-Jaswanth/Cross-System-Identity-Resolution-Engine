import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';
import { 
  Fingerprint, GitPullRequest, ShieldAlert, CheckCircle2, 
  ArrowRight, FilePlus, Search, Clock, Award
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const OperatorDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['operatorStats'],
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
      {/* Top Hero Card focusing on Primary Workflow */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-500/20 text-white rounded-premium p-6 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              Operator Ingestion & Resolution Portal
            </span>
            <span className="text-xs text-slate-400 font-mono">Role: Identity Operator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Identity Ingestion Workspace
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your primary operational workflow is ingesting identity data from Aadhaar, ABHA, DigiLocker, and mobile streams, initiating candidate retrieval, and resolving duplicate records.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <Link
            to="/identities/register"
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-2 shadow-soft"
          >
            <FilePlus size={16} />
            <span>REGISTER NEW IDENTITY</span>
          </Link>
          <Link
            to="/resolution"
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <GitPullRequest size={16} />
            <span>Resolution Workspace</span>
          </Link>
        </div>
      </div>

      {/* Operator Work Queue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Pending Verification Requests</span>
            <Clock className="text-amber-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            3
          </div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">
            Requires Manual Review
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Duplicate/Conflict Warnings</span>
            <ShieldAlert className="text-rose-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            1
          </div>
          <span className="text-[11px] text-rose-500 font-medium mt-1 block">
            High Severity Discrepancy
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-4 shadow-soft">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Ingested Identities</span>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 font-mono">
            {stats?.total_active_identities || 45}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            Encrypted & Hashed PII
          </span>
        </div>
      </div>

      {/* Operator Primary Action List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Active Operator Tasks & Queue
            </h3>
            <span className="text-xs text-slate-400 font-mono">Sorted by Priority</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                  Verify High-Confidence Match Candidate #RES-8902
                </span>
                <span className="text-slate-500">
                  Aadhaar ID matched with ABHA ID (Confidence Score: 88.5%)
                </span>
              </div>
              <Link
                to="/verification"
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold rounded text-xs shrink-0 flex items-center gap-1"
              >
                <span>Process Task</span>
                <ArrowRight size={12} />
              </Link>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 dark:text-slate-100 text-sm block">
                  Ingest Supplementary DigiLocker Document Records
                </span>
                <span className="text-slate-500">
                  New incoming stream payload queued for processing
                </span>
              </div>
              <Link
                to="/identities/register"
                className="px-3.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold rounded text-xs shrink-0 flex items-center gap-1"
              >
                <span>Register Data</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Operator Navigation Shortcut
          </h3>

          <div className="space-y-2 text-xs font-medium">
            <Link to="/identities/register" className="p-3 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 rounded-lg border border-emerald-500/20 flex items-center justify-between hover:bg-emerald-500/20 transition-all font-bold">
              <span className="flex items-center gap-2">
                <FilePlus size={16} className="text-emerald-600 dark:text-emerald-400" />
                <span>Single Identity Ingestion</span>
              </span>
              <ArrowRight size={14} className="text-emerald-600 dark:text-emerald-400" />
            </Link>

            <Link to="/identities/bulk" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
              <span className="flex items-center gap-2">
                <Fingerprint size={16} className="text-primary-500" />
                <span className="font-semibold">Bulk Identity Upload</span>
              </span>
              <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
            </Link>

            <Link to="/identities" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
              <span className="flex items-center gap-2">
                <Search size={16} className="text-indigo-500" />
                <span className="font-semibold">Search Records Database</span>
              </span>
              <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
            </Link>

            <Link to="/clusters" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
              <span className="flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                <span className="font-semibold">View Identity Clusters</span>
              </span>
              <ArrowRight size={14} className="text-slate-400 dark:text-slate-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OperatorDashboard;
