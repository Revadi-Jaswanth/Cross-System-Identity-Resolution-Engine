import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, Award, CreditCard, Activity, FolderKey, 
  CheckCircle2, ArrowRight, ShieldCheck, BadgeCheck, Sparkles, Lock, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const CitizenDashboard = () => {
  const { user } = useAuth();

  const [claimState, setClaimState] = useState({
    aadhaar: localStorage.getItem('citizen_aadhaar_status') === 'verified',
    abha: localStorage.getItem('citizen_abha_status') === 'verified',
    digilocker: localStorage.getItem('citizen_digilocker_status') === 'verified',
    goldenProfile: localStorage.getItem('citizen_golden_status') === 'generated'
  });

  useEffect(() => {
    const handleStorage = () => {
      setClaimState({
        aadhaar: localStorage.getItem('citizen_aadhaar_status') === 'verified',
        abha: localStorage.getItem('citizen_abha_status') === 'verified',
        digilocker: localStorage.getItem('citizen_digilocker_status') === 'verified',
        goldenProfile: localStorage.getItem('citizen_golden_status') === 'generated'
      });
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Citizen Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-primary-950 to-slate-900 text-white rounded-premium p-6 md:p-8 shadow-soft border border-primary-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-500/20 text-primary-300 font-semibold text-xs uppercase tracking-wider">
                Citizen Portal • My Identity Workspace
              </span>
              <span className="text-xs text-slate-400 font-mono">Citizen Account</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome, {user?.username || 'Citizen'}!
            </h1>
            <p className="text-xs md:text-sm text-slate-300 mt-2 max-w-xl leading-relaxed">
              View your linked digital identity credentials, monitor your privacy-preserved Golden Profile, and claim new verification certificates.
            </p>
            <p className="text-[11px] text-slate-400/70 italic mt-1">
              VeriSync — Bridging disparate identity sources into a single, trustworthy credential hub.
            </p>
          </div>

          <Link
            to="/claim-credentials"
            className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-soft flex items-center gap-2 shrink-0 ring-2 ring-amber-500/20"
          >
            <Sparkles size={16} />
            <span>CLAIM CREDENTIALS PORTAL</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Unclaimed Notice Banner if not complete */}
      {!claimState.goldenProfile && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl p-4 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-amber-500 shrink-0" />
            <span>
              <strong>Credentials Pending:</strong> You have unclaimed identity sources. Visit the Claim Credentials Portal to verify your Aadhaar, ABHA, and DigiLocker records.
            </span>
          </div>
          <Link
            to="/claim-credentials"
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold rounded shrink-0"
          >
            Claim Now
          </Link>
        </div>
      )}

      {/* Linked Credential Sources Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Aadhaar */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary-500/10 text-primary-500 rounded-lg">
                <CreditCard size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Aadhaar Record</h3>
                <span className="text-[10px] text-slate-400 font-mono">Primary Root Anchor</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
              claimState.aadhaar 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {claimState.aadhaar ? 'LINKED' : 'UNCLAIMED'}
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-400">Status:</span>
              <span className="font-semibold">{claimState.aadhaar ? 'XXXX-XXXX-9012 Verified' : 'Action Required'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cryptographic Hash:</span>
              <span className="text-primary-500 font-bold">{claimState.aadhaar ? 'sha256:a8f3...' : 'Pending Link'}</span>
            </div>
          </div>
        </div>

        {/* ABHA */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Activity size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">ABHA Health ID</h3>
                <span className="text-[10px] text-slate-400 font-mono">ABDM Health Network</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
              claimState.abha 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {claimState.abha ? 'LINKED' : 'UNCLAIMED'}
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-400">Address:</span>
              <span className="font-semibold">{claimState.abha ? 'citizen.demo@abdm' : 'Action Required'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cryptographic Hash:</span>
              <span className="text-emerald-500 font-bold">{claimState.abha ? 'sha256:74b3...' : 'Pending Link'}</span>
            </div>
          </div>
        </div>

        {/* DigiLocker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                <FolderKey size={20} />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">DigiLocker Vault</h3>
                <span className="text-[10px] text-slate-400 font-mono">Document Vault</span>
              </div>
            </div>
            <span className={`px-2 py-0.5 text-[11px] font-bold rounded ${
              claimState.digilocker 
                ? 'bg-emerald-500/10 text-emerald-600' 
                : 'bg-amber-500/10 text-amber-600'
            }`}>
              {claimState.digilocker ? 'LINKED' : 'UNCLAIMED'}
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex justify-between">
              <span className="text-slate-400">Vault Ref:</span>
              <span className="font-semibold">{claimState.digilocker ? 'DL-VAULT-8902' : 'Action Required'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cryptographic Hash:</span>
              <span className="text-indigo-500 font-bold">{claimState.digilocker ? 'sha256:d53a...' : 'Pending Link'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Golden Profile Card */}
      <div className={`bg-white dark:bg-slate-900 border rounded-premium p-6 shadow-soft space-y-4 transition-all ${
        claimState.goldenProfile ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-slate-200 dark:border-slate-800'
      }`}>
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <Award className={claimState.goldenProfile ? "text-amber-500" : "text-slate-400"} size={24} />
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">My Unified Golden Profile</h3>
              <span className="text-xs text-slate-400">VeriSync Identity Resolution Result</span>
            </div>
          </div>
          <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1.5 font-bold ${
            claimState.goldenProfile 
              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/30' 
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          }`}>
            {claimState.goldenProfile ? (
              <>
                <CheckCircle2 size={14} />
                <span>Resolution Match: 98.4%</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>UNRESOLVED</span>
              </>
            )}
          </span>
        </div>

        {claimState.goldenProfile ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Master Identity ID</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">GOLDEN-ID-9F82A-432C</span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase">Master Cryptographic Hash</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">sha256:e91024bc9901a8f392bd74b3e83dd53adb62</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center space-y-2">
            <p className="text-xs text-slate-500 leading-relaxed">
              Your Golden Profile has not been generated yet. Please open the Claim Credentials Portal to verify your Aadhaar, ABHA, and DigiLocker records and execute VeriSync.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Link
            to="/claim-credentials"
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-lg transition-all flex items-center gap-2 shadow-soft"
          >
            <Sparkles size={14} />
            <span>Open Claim Credentials Portal</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CitizenDashboard;
