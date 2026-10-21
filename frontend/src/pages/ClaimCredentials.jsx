import React, { useState } from 'react';
import { 
  CreditCard, Activity, FolderKey, Award, CheckCircle2, 
  Lock, ArrowRight, RefreshCw, X, ShieldCheck, FileCheck, 
  HelpCircle, ExternalLink, Sparkles
} from 'lucide-react';

export const ClaimCredentials = () => {
  // State for credential completion status
  const [statuses, setStatuses] = useState(() => ({
    aadhaar: localStorage.getItem('citizen_aadhaar_status') || 'pending',
    abha: localStorage.getItem('citizen_abha_status') || 'pending',
    digilocker: localStorage.getItem('citizen_digilocker_status') || 'pending',
    goldenProfile: localStorage.getItem('citizen_golden_status') || 'pending'
  }));

  // Generated simulated cryptographic metadata
  const [credentialsData, setCredentialsData] = useState(() => ({
    aadhaar: localStorage.getItem('citizen_aadhaar_status') === 'verified' ? {
      id: 'CRED-AADHAAR-8F92BD',
      hash: 'sha256:a8f392bd3a41c2901b8742e9'
    } : null,
    abha: localStorage.getItem('citizen_abha_status') === 'verified' ? {
      id: 'CRED-ABHA-74B3E8',
      hash: 'sha256:74b3e83dab9b9a306dfa1290',
      abhaAddress: 'citizen.demo@abdm'
    } : null,
    digilocker: localStorage.getItem('citizen_digilocker_status') === 'verified' ? {
      id: 'CRED-DIGILOCKER-D53ADB',
      hash: 'sha256:d53adb62caf2432c9fa0b35d'
    } : null,
    goldenProfile: localStorage.getItem('citizen_golden_status') === 'generated' ? {
      id: 'GOLDEN-ID-9F82A-432C',
      masterHash: 'sha256:e91024bc9901a8f392bd74b3e83dd53adb62',
      resolutionConfidence: '98.4%'
    } : null
  }));

  // Modal controls
  const [activeModal, setActiveModal] = useState(null); // 'aadhaar' | 'abha' | 'digilocker' | 'golden' | null
  const [simulatedOtp, setSimulatedOtp] = useState('123456');
  const [isProcessing, setIsProcessing] = useState(false);

  // Check if prerequisites are met for Golden Profile
  const arePrerequisitesMet = 
    statuses.aadhaar === 'verified' && 
    statuses.abha === 'verified' && 
    statuses.digilocker === 'verified';

  // Handle resets
  const handleResetAll = () => {
    localStorage.removeItem('citizen_aadhaar_status');
    localStorage.removeItem('citizen_abha_status');
    localStorage.removeItem('citizen_digilocker_status');
    localStorage.removeItem('citizen_golden_status');
    setStatuses({
      aadhaar: 'pending',
      abha: 'pending',
      digilocker: 'pending',
      goldenProfile: 'pending'
    });
    setCredentialsData({
      aadhaar: null,
      abha: null,
      digilocker: null,
      goldenProfile: null
    });
    setActiveModal(null);
  };

  // Simulated handlers
  const handleVerifyAadhaar = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      localStorage.setItem('citizen_aadhaar_status', 'verified');
      setStatuses(prev => ({ ...prev, aadhaar: 'verified' }));
      setCredentialsData(prev => ({
        ...prev,
        aadhaar: {
          id: 'CRED-AADHAAR-8F92BD',
          hash: 'sha256:a8f392bd3a41c2901b8742e9',
          timestamp: new Date().toLocaleTimeString(),
          holder: 'Citizen (Aadhaar Verified)'
        }
      }));
      setIsProcessing(false);
      setActiveModal(null);
    }, 1200);
  };

  const handleVerifyAbha = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      localStorage.setItem('citizen_abha_status', 'verified');
      setStatuses(prev => ({ ...prev, abha: 'verified' }));
      setCredentialsData(prev => ({
        ...prev,
        abha: {
          id: 'CRED-ABHA-74B3E8',
          hash: 'sha256:74b3e83dab9b9a306dfa1290',
          timestamp: new Date().toLocaleTimeString(),
          abhaAddress: 'citizen.demo@abdm'
        }
      }));
      setIsProcessing(false);
      setActiveModal(null);
    }, 1200);
  };

  const handleVerifyDigiLocker = (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      localStorage.setItem('citizen_digilocker_status', 'verified');
      setStatuses(prev => ({ ...prev, digilocker: 'verified' }));
      setCredentialsData(prev => ({
        ...prev,
        digilocker: {
          id: 'CRED-DIGILOCKER-D53ADB',
          hash: 'sha256:d53adb62caf2432c9fa0b35d',
          timestamp: new Date().toLocaleTimeString(),
          documentsCount: 3
        }
      }));
      setIsProcessing(false);
      setActiveModal(null);
    }, 1200);
  };

  const handleGenerateGoldenProfile = (e) => {
    e.preventDefault();
    if (!arePrerequisitesMet) return;
    setIsProcessing(true);
    setTimeout(() => {
      localStorage.setItem('citizen_golden_status', 'generated');
      setStatuses(prev => ({ ...prev, goldenProfile: 'generated' }));
      setCredentialsData(prev => ({
        ...prev,
        goldenProfile: {
          id: 'GOLDEN-ID-9F82A-432C',
          masterHash: 'sha256:e91024bc9901a8f392bd74b3e83dd53adb62',
          resolutionConfidence: '98.4%',
          linkedSourcesCount: 3,
          generatedAt: new Date().toLocaleString()
        }
      }));
      setIsProcessing(false);
      setActiveModal(null);
    }, 1500);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 md:p-8 shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold text-xs uppercase tracking-wider">
                Citizen Portal • Pilot Program
              </span>
              <span className="text-xs text-slate-400 font-mono">v1.0-Verifiable</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Claim Your Digital Credentials
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-2xl">
              Welcome to the VeriSync Credential Portal! Follow the timeline steps below to claim and cryptographically link your identities into a unified Golden Profile.
            </p>
          </div>

          <button
            onClick={handleResetAll}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
          >
            <RefreshCw size={14} />
            <span>Reset Demo Flow</span>
          </button>
        </div>
      </div>

      {/* Demo Simulation Alert Banner */}
      <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs leading-relaxed">
        <HelpCircle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block text-amber-900 dark:text-amber-200 mb-0.5">
            Safe Demonstration & Privacy Notice
          </strong>
          This portal simulates the Privacy-Preserving Record Linkage (PPRL) verification workflow. No actual citizen PII or real government login credentials are stored or requested. All cryptographic hashes shown are safe demonstration values.
        </div>
      </div>

      {/* Timeline Container */}
      <div className="relative pl-4 md:pl-8">
        {/* STAGE 1: Aadhaar Credential */}
        <div className="relative z-10 flex items-stretch gap-4 md:gap-6 pb-8">
          {/* Step Icon Node & Segment 1 Line */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all z-10 ${
              statuses.aadhaar === 'verified'
                ? 'bg-emerald-500 text-white border-white dark:border-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 border-primary-500 dark:border-primary-400 shadow-soft'
            }`}>
              {statuses.aadhaar === 'verified' ? <CheckCircle2 size={24} /> : <CreditCard size={24} />}
            </div>

            {/* Vertical connector: Circle 1 -> Circle 2 */}
            <div className="w-1 md:w-1.5 flex-1 relative bg-slate-200 dark:bg-slate-800 rounded-full my-1.5 overflow-hidden">
              {statuses.aadhaar === 'verified' && (
                <div 
                  className={`w-full bg-gradient-to-b from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-700 ease-out relative ${
                    statuses.abha === 'verified' ? 'h-full' : 'h-[72%]'
                  }`}
                >
                  {statuses.abha !== 'verified' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Stage 1 • Primary Identity
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 mt-0.5">
                  Aadhaar Credential
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    ★ Start Here
                  </span>
                </h3>
              </div>
              
              <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                statuses.aadhaar === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {statuses.aadhaar === 'verified' ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Verified & Linkable</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Pending Claim</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 my-4 leading-relaxed">
              Claim a Verifiable Credential representing your official Aadhaar Unique Identification Record. This serves as the root anchor for VeriSync identity resolution.
            </p>

            {statuses.aadhaar === 'verified' && credentialsData.aadhaar && (
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-4 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification ID:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{credentialsData.aadhaar.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cryptographic Hash:</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{credentialsData.aadhaar.hash}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">Verification Method: Simulated OTP</span>
              <button
                onClick={() => setActiveModal('aadhaar')}
                disabled={statuses.aadhaar === 'verified'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  statuses.aadhaar === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft hover:shadow'
                }`}
              >
                {statuses.aadhaar === 'verified' ? (
                  <>
                    <ShieldCheck size={14} />
                    <span>CREDENTIAL CLAIMED</span>
                  </>
                ) : (
                  <>
                    <span>CLAIM CREDENTIALS</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* STAGE 2: ABHA Credential */}
        <div className="relative z-10 flex items-stretch gap-4 md:gap-6 pb-8">
          {/* Step Icon Node & Segment 2 Line */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all z-10 ${
              statuses.abha === 'verified'
                ? 'bg-emerald-500 text-white border-white dark:border-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 border-primary-500 dark:border-primary-400 shadow-soft'
            }`}>
              {statuses.abha === 'verified' ? <CheckCircle2 size={24} /> : <Activity size={24} />}
            </div>

            {/* Vertical connector: Circle 2 -> Circle 3 */}
            <div className="w-1 md:w-1.5 flex-1 relative bg-slate-200 dark:bg-slate-800 rounded-full my-1.5 overflow-hidden">
              {statuses.abha === 'verified' && (
                <div 
                  className={`w-full bg-gradient-to-b from-emerald-500 to-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-700 ease-out relative ${
                    statuses.digilocker === 'verified' ? 'h-full' : 'h-[72%]'
                  }`}
                >
                  {statuses.digilocker !== 'verified' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Stage 2 • Health Network Link
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  ABHA Health Account
                </h3>
              </div>

              <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                statuses.abha === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {statuses.abha === 'verified' ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Verified & Linkable</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Pending Claim</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 my-4 leading-relaxed">
              Claim and link your Ayushman Bharat Health Account (ABHA) credential to establish your verified health identity node.
            </p>

            {statuses.abha === 'verified' && credentialsData.abha && (
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-4 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">ABHA Address:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{credentialsData.abha.abhaAddress}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cryptographic Hash:</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{credentialsData.abha.hash}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">Verification Method: ABDM Network Link</span>
              <button
                onClick={() => setActiveModal('abha')}
                disabled={statuses.abha === 'verified'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  statuses.abha === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft hover:shadow'
                }`}
              >
                {statuses.abha === 'verified' ? (
                  <>
                    <ShieldCheck size={14} />
                    <span>CREDENTIAL CLAIMED</span>
                  </>
                ) : (
                  <>
                    <span>CLAIM CREDENTIALS</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* STAGE 3: DigiLocker Credentials */}
        <div className="relative z-10 flex items-stretch gap-4 md:gap-6 pb-8">
          {/* Step Icon Node & Segment 3 Line */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all z-10 ${
              statuses.digilocker === 'verified'
                ? 'bg-emerald-500 text-white border-white dark:border-slate-900 shadow-md'
                : 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 border-primary-500 dark:border-primary-400 shadow-soft'
            }`}>
              {statuses.digilocker === 'verified' ? <CheckCircle2 size={24} /> : <FolderKey size={24} />}
            </div>

            {/* Vertical connector: Circle 3 -> Circle 4 */}
            <div className="w-1 md:w-1.5 flex-1 relative bg-slate-200 dark:bg-slate-800 rounded-full my-1.5 overflow-hidden">
              {statuses.digilocker === 'verified' && (
                <div 
                  className={`w-full bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] transition-all duration-700 ease-out relative ${
                    statuses.goldenProfile === 'generated' ? 'h-full' : 'h-[72%]'
                  }`}
                >
                  {statuses.goldenProfile !== 'generated' && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card Content */}
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 shadow-soft hover:shadow-md transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Stage 3 • Verified Document Vault
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  DigiLocker Credentials
                </h3>
              </div>

              <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                statuses.digilocker === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {statuses.digilocker === 'verified' ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Verified & Linkable</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Pending Claim</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 my-4 leading-relaxed">
              Claim Verifiable Credentials describing your authenticated driving license, educational diplomas, and official documents stored in DigiLocker.
            </p>

            {statuses.digilocker === 'verified' && credentialsData.digilocker && (
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 mb-4 font-mono text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vault Reference:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{credentialsData.digilocker.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cryptographic Hash:</span>
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{credentialsData.digilocker.hash}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">Verification Method: OAuth 2.0 Auth Vault</span>
              <button
                onClick={() => setActiveModal('digilocker')}
                disabled={statuses.digilocker === 'verified'}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  statuses.digilocker === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default'
                    : 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft hover:shadow'
                }`}
              >
                {statuses.digilocker === 'verified' ? (
                  <>
                    <ShieldCheck size={14} />
                    <span>CREDENTIAL CLAIMED</span>
                  </>
                ) : (
                  <>
                    <span>CLAIM CREDENTIALS</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* STAGE 4: Unified Golden Profile */}
        <div className="relative z-10 flex items-start gap-4 md:gap-6">
          {/* Step Icon Node ONLY - No line below! */}
          <div className="flex flex-col items-center shrink-0">
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center border-4 shrink-0 transition-all z-10 ${
              statuses.goldenProfile === 'generated'
                ? 'bg-amber-500 text-white border-white dark:border-slate-900 shadow-lg animate-pulse'
                : arePrerequisitesMet
                ? 'bg-white dark:bg-slate-900 text-amber-500 border-amber-500 shadow-soft ring-4 ring-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-300 dark:border-slate-700'
            }`}>
              <Award size={24} />
            </div>
          </div>

          {/* Card Content */}
          <div className={`flex-1 bg-white dark:bg-slate-900 border rounded-premium p-6 shadow-soft transition-all ${
            statuses.goldenProfile === 'generated'
              ? 'border-amber-500/40 dark:border-amber-500/30 ring-1 ring-amber-500/20'
              : arePrerequisitesMet
              ? 'border-amber-500/30'
              : 'border-slate-200 dark:border-slate-800 opacity-90'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles size={14} />
                  Stage 4 • Resolution & Master Identity
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  Unified Golden Profile
                </h3>
              </div>

              <span className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                statuses.goldenProfile === 'generated'
                  ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-bold'
                  : arePrerequisitesMet
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
              }`}>
                {statuses.goldenProfile === 'generated' ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Golden Profile Issued</span>
                  </>
                ) : arePrerequisitesMet ? (
                  <>
                    <FileCheck size={14} />
                    <span>Ready for Resolution</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    <span>Prerequisites Required</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 my-4 leading-relaxed">
              Generate and inspect the final unified identity created from all verified credential sources (Aadhaar, ABHA, DigiLocker). Uses the VeriSync multi-source resolution engine to produce a single Golden Record.
            </p>

            {!arePrerequisitesMet && (
              <div className="bg-slate-100 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700/60 mb-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Lock size={14} className="text-slate-400 shrink-0" />
                <span>
                  Please complete Stage 1 (Aadhaar), Stage 2 (ABHA), and Stage 3 (DigiLocker) to unlock Golden Profile generation.
                </span>
              </div>
            )}

            {statuses.goldenProfile === 'generated' && credentialsData.goldenProfile && (
              <div className="bg-amber-500/5 dark:bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 mb-4 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-amber-500/10">
                  <span className="text-slate-400">Master Identity ID:</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{credentialsData.goldenProfile.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Unified Cryptographic Hash:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{credentialsData.goldenProfile.masterHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Resolution Confidence Match:</span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{credentialsData.goldenProfile.resolutionConfidence}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400 font-medium">VeriSync Linking Engine</span>
              <button
                onClick={() => setActiveModal('golden')}
                disabled={!arePrerequisitesMet || statuses.goldenProfile === 'generated'}
                className={`px-5 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                  statuses.goldenProfile === 'generated'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 cursor-default border border-amber-500/20'
                    : arePrerequisitesMet
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold shadow-soft hover:shadow ring-2 ring-amber-500/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                {statuses.goldenProfile === 'generated' ? (
                  <>
                    <Award size={14} />
                    <span>GOLDEN PROFILE GENERATED</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>GENERATE GOLDEN PROFILE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- SIMULATION MODALS --- */}

      {/* Modal 1: Aadhaar OTP Simulation */}
      {activeModal === 'aadhaar' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="text-primary-500" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Claim Aadhaar Credential
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="bg-blue-500/10 text-blue-800 dark:text-blue-300 p-3 rounded-lg text-xs leading-relaxed">
              <strong>Simulated OTP Flow:</strong> Enter the demo verification code to claim your primary identity credential.
            </div>

            <form onSubmit={handleVerifyAadhaar} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 uppercase">Sample Aadhaar Ref</label>
                <input 
                  type="text" 
                  disabled 
                  value="XXXX-XXXX-9012 (Demo Holder)" 
                  className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-2 font-mono text-slate-700 dark:text-slate-300"
                />
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-semibold mb-1">
                  Enter Simulated OTP Code (Pre-filled):
                </label>
                <input 
                  type="text" 
                  required
                  value={simulatedOtp}
                  onChange={(e) => setSimulatedOtp(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-primary-500 rounded p-2.5 font-mono text-center tracking-widest text-base font-bold text-slate-900 dark:text-slate-100"
                />
                <span className="text-[10px] text-slate-400 block mt-1">Default test OTP: 123456</span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center gap-2"
                >
                  {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                  <span>{isProcessing ? 'Verifying OTP...' : 'Verify & Claim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: ABHA Health Link Simulation */}
      {activeModal === 'abha' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-primary-500" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Link ABHA Health Account
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Target ABHA ID:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">91-8023-4412-0091</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Health Address:</span>
                  <span className="font-semibold text-primary-500 font-mono">citizen.demo@abdm</span>
                </div>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Clicking authorize will simulate linking your Ayushman Bharat Health Account to VeriSync.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-2 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyAbha}
                disabled={isProcessing}
                className="px-4 py-2 text-xs rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <ExternalLink size={14} />}
                <span>{isProcessing ? 'Connecting ABDM Node...' : 'Authorize & Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: DigiLocker Vault Simulation */}
      {activeModal === 'digilocker' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderKey className="text-primary-500" size={20} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Authorize DigiLocker Documents
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">Select simulated documents to link to your resolution profile:</p>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Driving License</span>
                  <span className="font-mono text-slate-400 text-[11px]">DL-04202100912</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">CBSE XII Certificate</span>
                  <span className="font-mono text-slate-400 text-[11px]">CBSE-2018-91203</span>
                </div>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-850 rounded border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Vehicle Registration</span>
                  <span className="font-mono text-slate-400 text-[11px]">MH-12-AB-9921</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVerifyDigiLocker}
                disabled={isProcessing}
                className="px-4 py-2 text-xs rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-bold flex items-center gap-2"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <FileCheck size={14} />}
                <span>{isProcessing ? 'Verifying Vault...' : 'Claim Vault Credentials'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Golden Profile Generation Simulation */}
      {activeModal === 'golden' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Award className="text-amber-500" size={22} />
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                  Generate Unified Golden Profile
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                All prerequisite credentials have been verified. The engine will now perform multi-source deduplication and conflict resolution across your linked sources:
              </p>

              <div className="space-y-2 font-mono">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 flex justify-between">
                  <span>✔ Aadhaar Root Anchor</span>
                  <span>sha256:a8f392bd...</span>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 flex justify-between">
                  <span>✔ ABHA Health Node</span>
                  <span>sha256:74b3e83d...</span>
                </div>
                <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded border border-emerald-500/20 flex justify-between">
                  <span>✔ DigiLocker Vault</span>
                  <span>sha256:d53adb62...</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-3.5 py-2 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerateGoldenProfile}
                disabled={isProcessing}
                className="px-5 py-2 text-xs rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold flex items-center gap-2 shadow-soft"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={14} /> : <Sparkles size={14} />}
                <span>{isProcessing ? 'Executing VeriSync...' : 'Confirm & Issue Golden Profile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimCredentials;
