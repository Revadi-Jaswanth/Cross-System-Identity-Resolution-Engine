import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useDarkMode } from '@/hooks/useDarkMode';
import {
  Fingerprint, Shield, ShieldCheck, Sparkles, Cpu, GitPullRequest,
  Database, Layers, Lock, ArrowRight, CheckCircle2, AlertTriangle,
  ChevronDown, Sliders, Award, History, User, Users, Building2,
  Play, RefreshCw, FileText, Sun, Moon, Zap, ExternalLink, Network,
  Check, Info, Eye, X, ArrowLeft, Home
} from 'lucide-react';

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { isCitizen, isAuditor, isOperator, isOrgAdmin, isSuperAdmin } = usePermissions();
  const { isDark, toggleTheme } = useDarkMode();

  // Active section state: null (Home view) | 'simulator' | 'architecture' | 'portals' | 'security' | 'faq'
  const [activeSection, setActiveSection] = useState(null);

  // Interactive Simulator State
  const [selectedScenario, setSelectedScenario] = useState('partial_name');
  const [sensitivity, setSensitivity] = useState(75);
  const [simRunning, setSimRunning] = useState(false);
  const [simStage, setSimStage] = useState(0);
  const [simComplete, setSimComplete] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [architectureStep, setArchitectureStep] = useState(2);

  const handleSelectSection = (sectionId) => {
    setActiveSection(sectionId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToHome = () => {
    setActiveSection(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scenarios Data
  const scenarios = {
    partial_name: {
      id: 'partial_name',
      title: 'Aadhaar + ABHA Phonetic & Abbreviation Match',
      desc: 'Resolve differences between formal UIDAI record and abbreviated Ayushman Bharat ABHA hospital entry.',
      sourceA: {
        system: 'UIDAI Aadhaar',
        sourceColor: 'border-orange-500/40 bg-orange-500/5',
        badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        name: 'Arjun Kumar Verma',
        dob: '1994-08-15',
        phone: '+91 98765 43210',
        address: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru',
        idNumber: 'UID: •••• •••• 9012'
      },
      sourceB: {
        system: 'ABHA Health Registry',
        sourceColor: 'border-teal-500/40 bg-teal-500/5',
        badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        name: 'A. K. Verma',
        dob: '1994-08-15',
        phone: '+91 98765 43210',
        address: 'Bellandur Outer Ring Road, Bangalore',
        idNumber: 'ABHA: 14-8892-0045-6671'
      },
      metrics: {
        nameJaroWinkler: 0.93,
        dobMatch: 1.0,
        phoneMatch: 1.0,
        addressLevenshtein: 0.78,
        compositeScore: 94.6,
        status: 'RESOLVED_MERGE',
        statusText: 'Deterministic & Probabilistic Match Confirmed'
      },
      conflictResolution: {
        field: 'Legal Full Name',
        decision: 'Aadhaar (Authority Weight: 0.95 vs ABHA: 0.70)',
        finalName: 'Arjun Kumar Verma',
        finalAddress: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru'
      }
    },
    address_conflict: {
      id: 'address_conflict',
      title: 'Aadhaar vs DigiLocker Address Recency Conflict',
      desc: 'Attribute disagreement on residential address across identity registries resolved via timestamp recency.',
      sourceA: {
        system: 'UIDAI Aadhaar (2021)',
        sourceColor: 'border-orange-500/40 bg-orange-500/5',
        badgeColor: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        name: 'Priya Ananya Sharma',
        dob: '1991-03-22',
        phone: '+91 91234 56789',
        address: 'Old Ward 7, Indiranagar, Bengaluru - 560038',
        idNumber: 'UID: •••• •••• 4421'
      },
      sourceB: {
        system: 'DigiLocker Electricity eKYC (2025)',
        sourceColor: 'border-blue-500/40 bg-blue-500/5',
        badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        name: 'Priya Sharma',
        dob: '1991-03-22',
        phone: '+91 91234 56789',
        address: 'Tower B-1402, Prestige Lakeside, Whitefield, Bengaluru - 560066',
        idNumber: 'DL: KA03-202300981'
      },
      metrics: {
        nameJaroWinkler: 0.96,
        dobMatch: 1.0,
        phoneMatch: 1.0,
        addressLevenshtein: 0.42,
        compositeScore: 89.2,
        status: 'RESOLVED_CONFLICT',
        statusText: 'Identity Matched • Address Conflict Arbitrated'
      },
      conflictResolution: {
        field: 'Primary Residential Address',
        decision: 'Temporal Recency Policy: DigiLocker verified electricity utility (Jan 2025) supersedes 2021 record.',
        finalName: 'Priya Ananya Sharma',
        finalAddress: 'Tower B-1402, Prestige Lakeside, Whitefield, Bengaluru - 560066'
      }
    },
    suspected_fraud: {
      id: 'suspected_fraud',
      title: 'Divergent Identity Fraud / Mismatched Biometric Hash',
      desc: 'Partial name match with conflicting birth year and mismatched identity fingerprint flagged for forensic review.',
      sourceA: {
        system: 'PAN NSDL Registry',
        sourceColor: 'border-indigo-500/40 bg-indigo-500/5',
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        name: 'Vikram Malhotra',
        dob: '1987-11-04',
        phone: '+91 98888 11111',
        address: 'Sector 15, Chandigarh',
        idNumber: 'PAN: ABCPM1234F'
      },
      sourceB: {
        system: 'Third-Party Bank eKYC',
        sourceColor: 'border-rose-500/40 bg-rose-500/5',
        badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        name: 'Vikram R. Malhotra',
        dob: '1993-02-19',
        phone: '+91 98888 11111',
        address: 'Civil Lines, Ludhiana',
        idNumber: 'BANK: HDFC-9912048'
      },
      metrics: {
        nameJaroWinkler: 0.88,
        dobMatch: 0.0,
        phoneMatch: 1.0,
        addressLevenshtein: 0.28,
        compositeScore: 51.4,
        status: 'MANUAL_REVIEW_FLAGGED',
        statusText: 'Threshold Unmet • Dispatched to Verification Desk'
      },
      conflictResolution: {
        field: 'Date of Birth & Biometric Token',
        decision: 'CRITICAL CONFLICT: 6-year DOB divergence exceeds tolerance (max delta: 1 year). Dispatched to Compliance Auditor.',
        finalName: 'Pending Manual Adjudication',
        finalAddress: 'Action: Operator Desk Verification Hold'
      }
    }
  };

  const currentScenario = scenarios[selectedScenario];

  const handleRunSimulator = () => {
    setSimRunning(true);
    setSimComplete(false);
    setSimStage(1);

    setTimeout(() => setSimStage(2), 500);
    setTimeout(() => setSimStage(3), 1000);
    setTimeout(() => setSimStage(4), 1500);
    setTimeout(() => {
      setSimRunning(false);
      setSimComplete(true);
    }, 2000);
  };

  const getDashboardPath = () => {
    if (isCitizen) return '/citizen/dashboard';
    if (isAuditor) return '/auditor/dashboard';
    if (isOperator) return '/operator/dashboard';
    if (isOrgAdmin) return '/organization/dashboard';
    if (isSuperAdmin) return '/admin/dashboard';
    return '/dashboard';
  };

  const getRoleName = () => {
    if (isSuperAdmin) return 'Super Admin';
    if (isOrgAdmin) return 'Org Admin';
    if (isOperator) return 'Operator';
    if (isAuditor) return 'Auditor';
    if (isCitizen) return 'Citizen';
    return 'User';
  };

  const faqItems = [
    {
      q: 'Why not simply use the Aadhaar number as a universal foreign key everywhere?',
      a: 'In real-world national ecosystems, strict constitutional and statutory boundaries (such as UIDAI data vault restrictions, Supreme Court privacy rulings, and multi-agency silos) forbid unredacted universal storage of Aadhaar numbers. Many agencies (hospitals, state departments, banks) only possess phone numbers, partial names, or local voter/health identifiers. VeriSync provides deterministic and probabilistic resolution that bridges records even when a single master key is absent, maintaining full data sovereignty and privacy compliance.'
    },
    {
      q: 'How does the Conflict Resolution Engine arbitrate opposing data points (e.g. different addresses or names)?',
      a: 'VeriSync implements a multi-tiered configurable arbitration policy. First, authority weighting: UIDAI is weighted highest for demographic name/DOB, ABHA for healthcare identifiers, and DigiLocker utility bills for residential address recency. Second, temporal timestamp fallback: verified records updated in 2025 automatically supersede stale 2020 entries. Third, human-in-the-loop: when conflicts exceed acceptable statistical variance, they are quarantined and escalated to the Verification Desk for operator adjudication.'
    },
    {
      q: 'Is identity merging destructive or can linked identities be rolled back?',
      a: 'Identity resolution in VeriSync is 100% non-destructive. Raw records from source registries remain intact in their original immutable state. VeriSync forms dynamic graph clusters and generates a virtual "Golden Profile" layer. If new evidence emerges or an auditor requests a rollback, the cluster can be unmerged or re-split in one click with a complete cryptographic audit record.'
    },
    {
      q: 'What mathematical similarity and distance algorithms are executed during resolution?',
      a: 'The engine combines Candidate Blocking (Phonetic Soundex and Double Metaphone indexing to prune search space from O(N²) to O(N log N)) with hybrid metric evaluation: Jaro-Winkler string distance (specifically calibrated for Indian name prefix/suffix variations), Levenshtein edit distance, date-of-birth delta scoring, and exact SHA-256 phone/email hash equivalence.'
    },
    {
      q: 'How does VeriSync ensure tamper-proof auditability for compliance regulators?',
      a: 'Every match decision, automated conflict arbitration, and manual operator override is cryptographically hashed using SHA-256 and chained into an immutable audit trail. Regulators and compliance auditors can inspect decision explainability traces showing the exact weighting vector, confidence threshold, and source attribution at any point in time.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-primary-500 selection:text-white transition-colors duration-200">
      {/* ─────────────────────────────────────────────────────────
          STICKY TOP NAVBAR (Single-line buttons, no v2.4, no 42ms, no capabilities)
      ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/90 dark:bg-slate-950/90 border-b border-slate-200/80 dark:border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Brand Logo & Name (Clicking returns to clean Home view) */}
          <Link
            to="/"
            onClick={handleBackToHome}
            className="flex items-center gap-3 group focus:outline-none shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 via-primary-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary-500/25 group-hover:scale-105 transition-transform">
              <Fingerprint size={24} className="animate-pulse" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                VeriSync
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                Identity Resolution & Golden Profile Engine
              </p>
            </div>
          </Link>

          {/* Center Navigation Links (Capabilities REMOVED; clicking opens ONLY that section) */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => handleSelectSection('simulator')}
              className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeSection === 'simulator' ? 'text-primary-600 dark:text-primary-400 font-bold border-b-2 border-primary-600 pb-0.5' : ''
              }`}
            >
              <Play size={14} className="text-primary-500 fill-current" />
              <span>Live Simulator</span>
            </button>
            <button
              onClick={() => handleSelectSection('architecture')}
              className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap cursor-pointer ${
                activeSection === 'architecture' ? 'text-primary-600 dark:text-primary-400 font-bold border-b-2 border-primary-600 pb-0.5' : ''
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => handleSelectSection('portals')}
              className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap cursor-pointer ${
                activeSection === 'portals' ? 'text-primary-600 dark:text-primary-400 font-bold border-b-2 border-primary-600 pb-0.5' : ''
              }`}
            >
              Role Portals
            </button>
            <button
              onClick={() => handleSelectSection('security')}
              className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap cursor-pointer ${
                activeSection === 'security' ? 'text-primary-600 dark:text-primary-400 font-bold border-b-2 border-primary-600 pb-0.5' : ''
              }`}
            >
              Zero-Trust Audit
            </button>
            <button
              onClick={() => handleSelectSection('faq')}
              className={`hover:text-primary-600 dark:hover:text-primary-400 transition-colors whitespace-nowrap cursor-pointer ${
                activeSection === 'faq' ? 'text-primary-600 dark:text-primary-400 font-bold border-b-2 border-primary-600 pb-0.5' : ''
              }`}
            >
              FAQ
            </button>
          </nav>

          {/* Right Action Controls (42ms Engine Latency REMOVED; strictly single-line buttons) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all shrink-0 cursor-pointer"
            >
              {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
            </button>

            {/* Dynamic Auth Action with STRICT whitespace-nowrap single-line */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={getDashboardPath()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-all group whitespace-nowrap shrink-0"
                >
                  <User size={16} />
                  <span>Console ({getRoleName()})</span>
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 shrink-0">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 shadow-sm hover:shadow transition-all whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 group"
                >
                  <Lock size={14} className="text-slate-400 dark:text-slate-500 group-hover:text-primary-500 transition-colors" />
                  <span className="whitespace-nowrap">Sign In</span>
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold text-sm shadow-md shadow-primary-500/20 hover:shadow-primary-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 inline-flex"
                >
                  <span className="whitespace-nowrap">Citizen Portal</span>
                  <ArrowRight size={14} className="shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────
          CONDITION 1: DEFAULT HOME VIEW (UP TO 4 BOXES + CTA + FOOTER)
          Appears when activeSection is null
      ───────────────────────────────────────────────────────── */}
      {activeSection === null && (
        <div className="animate-fade-in">
          {/* HERO SECTION */}
          <section className="relative overflow-hidden pt-12 pb-16 md:pt-16 md:pb-20">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary-500/15 via-indigo-500/5 to-transparent blur-3xl pointer-events-none -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              {/* Release Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/80 text-primary-700 dark:text-primary-300 text-xs font-semibold mb-6 shadow-sm">
                <Sparkles size={14} className="text-primary-500" />
                <span>Next-Generation National Cross-System Identity Resolution</span>
                <span className="w-1 h-1 rounded-full bg-primary-400" />
                <span className="text-slate-500 dark:text-slate-400">Deterministic & Probabilistic Core</span>
              </div>

              {/* Hero Main Heading */}
              <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.1]">
                <span className="block mb-2">Unify Disparate Registries.</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-indigo-600 to-purple-600 dark:from-primary-400 dark:via-indigo-300 dark:to-purple-400">
                  VeriSync
                </span>
              </h1>

              {/* EXACT OFFICIAL TAGLINE */}
              <p className="mt-4 text-xl sm:text-2xl md:text-3xl font-semibold text-primary-700 dark:text-primary-300 max-w-4xl mx-auto italic tracking-tight">
                Bridging disparate identity sources into a single, trustworthy credential hub.
              </p>

              {/* Detailed Subtext */}
              <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                Bridge fragmented identity records across UIDAI Aadhaar, Ayushman Bharat ABHA, DigiLocker, PAN, and Banking eKYC. 
                VeriSync eliminates data silos and duplicate welfare claims with sub-50ms candidate blocking, Jaro-Winkler string similarity, 
                rule-based conflict resolution, and cryptographically verifiable Golden Records.
              </p>

              {/* Primary Action Buttons */}
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleSelectSection('simulator')}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold text-base shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 group cursor-pointer"
                >
                  <Play size={18} className="fill-white" />
                  <span>Launch Resolution Simulator</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                {isAuthenticated ? (
                  <Link
                    to={getDashboardPath()}
                    className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-base border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <Cpu size={18} className="text-primary-500" />
                    <span>Go to My Dashboard ({getRoleName()})</span>
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-semibold text-base border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <Lock size={18} className="text-slate-500" />
                    <span>Access Enterprise Console</span>
                  </Link>
                )}

                <button
                  onClick={() => handleSelectSection('architecture')}
                  className="px-5 py-3.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-base flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Network size={18} />
                  <span>Explore Architecture</span>
                </button>
              </div>

              {/* Trust Ecosystem Badges */}
              <div className="mt-12 pt-8 border-t border-slate-200/70 dark:border-slate-800/70 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> UIDAI Aadhaar Compatible
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Ayushman Bharat (ABHA) Aligned
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> DigiLocker eKYC Standard
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> SHA-256 Tamper-Proof Audit
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-500" /> Non-Destructive Soft Clustering
                </span>
              </div>

              {/* EXACT 4 BOXES */}
              <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-left">
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-soft hover:border-primary-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Resolution Precision</span>
                    <Award size={18} className="text-primary-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">99.94%</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deterministic + Jaro-Winkler similarity</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-soft hover:border-emerald-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Engine Latency</span>
                    <Zap size={18} className="text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">&lt; 45ms</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Sub-second candidate blocking retrieval</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-soft hover:border-indigo-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Cross-System Nodes</span>
                    <Database size={18} className="text-indigo-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">10M+</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Multi-registry identity scale capacity</p>
                </div>

                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-soft hover:border-amber-500/40 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs uppercase font-bold tracking-wider">Audit Integrity</span>
                    <ShieldCheck size={18} className="text-amber-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">100%</div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Immutable SHA-256 explainability traces</p>
                </div>
              </div>
            </div>
          </section>

          {/* BOTTOM CALL TO ACTION BANNER (EXACTLY BELOW 4 BOXES) */}
          <section className="py-16 bg-gradient-to-tr from-primary-900 via-indigo-900 to-slate-950 text-white text-center relative overflow-hidden">
            <div className="max-w-4xl mx-auto px-4 relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/10 text-primary-200 text-xs font-semibold mb-5">
                <Sparkles size={14} className="text-primary-300" />
                <span>Ready for Institutional Evaluation & Live Deployment</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
                Experience the Future of Identity Resolution
              </h2>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto mb-8">
                VeriSync delivers sovereign, deterministic, and probabilistic identity resolution to eliminate duplication 
                and guarantee trusted credential consolidation.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  onClick={() => handleSelectSection('simulator')}
                  className="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm shadow-lg hover:bg-slate-100 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Play size={16} className="fill-current" />
                  <span>Try Live Simulator</span>
                </button>
                {isAuthenticated ? (
                  <Link
                    to={getDashboardPath()}
                    className="px-6 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <span>Open {getRoleName()} Console</span>
                    <ArrowRight size={16} />
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm backdrop-blur-md border border-white/20 transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <Lock size={16} />
                    <span>Sign In to System</span>
                  </Link>
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          CONDITION 2: SPECIFIC SECTION VIEW (ONLY THAT SECTION OPENS!)
          Zero homepage contents rendered
      ───────────────────────────────────────────────────────── */}
      {activeSection !== null && (
        <div className="min-h-[70vh] py-10 animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Top Navigation Bar: Back to Home button */}
            <div className="mb-8 flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <button
                onClick={handleBackToHome}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary-600 dark:hover:text-primary-400 font-semibold text-xs shadow-sm hover:shadow transition-all cursor-pointer group"
              >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back to Home</span>
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                <span className="cursor-pointer hover:underline" onClick={handleBackToHome}>Home</span>
                <span>/</span>
                <span className="text-primary-600 dark:text-primary-400 font-bold uppercase">
                  {activeSection === 'simulator' && 'Live Simulator'}
                  {activeSection === 'architecture' && 'Architecture'}
                  {activeSection === 'portals' && 'Role Portals'}
                  {activeSection === 'security' && 'Zero-Trust Audit'}
                  {activeSection === 'faq' && 'FAQ'}
                </span>
              </div>
            </div>

            {/* 1. ONLY LIVE SIMULATOR */}
            {activeSection === 'simulator' && (
              <div>
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Play size={12} className="fill-current" />
                    Interactive Simulator
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    VeriSync Resolution Engine Simulator
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                    Select a scenario below to test candidate blocking, probabilistic similarity scoring, 
                    conflict arbitration, and golden profile minting.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-950/70 p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      {Object.values(scenarios).map((sc) => (
                        <button
                          key={sc.id}
                          onClick={() => {
                            setSelectedScenario(sc.id);
                            setSimComplete(false);
                            setSimRunning(false);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                            selectedScenario === sc.id
                              ? 'bg-primary-600 text-white shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          {sc.title}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <Sliders size={14} className="text-primary-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Match Threshold:</span>
                      <span className="font-mono font-bold text-primary-600 dark:text-primary-400">{sensitivity}%</span>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={sensitivity}
                        onChange={(e) => setSensitivity(Number(e.target.value))}
                        className="w-24 accent-primary-600 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* LHS Source Records */}
                      <div className="lg:col-span-5 space-y-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">Incoming Identity Records</span>
                          <span className="text-[11px] font-mono text-slate-400">Raw Data Layer</span>
                        </div>

                        <div className={`p-5 rounded-2xl border ${currentScenario.sourceA.sourceColor} relative`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${currentScenario.sourceA.badgeColor}`}>
                              {currentScenario.sourceA.system}
                            </span>
                            <span className="font-mono text-xs text-slate-400">{currentScenario.sourceA.idNumber}</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div><strong className="text-slate-900 dark:text-white">Name:</strong> {currentScenario.sourceA.name}</div>
                            <div><strong className="text-slate-900 dark:text-white">DOB:</strong> {currentScenario.sourceA.dob}</div>
                            <div><strong className="text-slate-900 dark:text-white">Mobile:</strong> {currentScenario.sourceA.phone}</div>
                            <div><strong className="text-slate-900 dark:text-white">Address:</strong> {currentScenario.sourceA.address}</div>
                          </div>
                        </div>

                        <div className={`p-5 rounded-2xl border ${currentScenario.sourceB.sourceColor} relative`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${currentScenario.sourceB.badgeColor}`}>
                              {currentScenario.sourceB.system}
                            </span>
                            <span className="font-mono text-xs text-slate-400">{currentScenario.sourceB.idNumber}</span>
                          </div>
                          <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <div><strong className="text-slate-900 dark:text-white">Name:</strong> {currentScenario.sourceB.name}</div>
                            <div><strong className="text-slate-900 dark:text-white">DOB:</strong> {currentScenario.sourceB.dob}</div>
                            <div><strong className="text-slate-900 dark:text-white">Mobile:</strong> {currentScenario.sourceB.phone}</div>
                            <div><strong className="text-slate-900 dark:text-white">Address:</strong> {currentScenario.sourceB.address}</div>
                          </div>
                        </div>

                        <button
                          onClick={handleRunSimulator}
                          disabled={simRunning}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                        >
                          {simRunning ? (
                            <>
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Executing VeriSync Engine Pipeline...</span>
                            </>
                          ) : (
                            <>
                              <Play size={16} className="fill-white" />
                              <span>Run VeriSync Match Engine</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* RHS Pipeline Trace */}
                      <div className="lg:col-span-7 bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 min-h-[380px] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                              <Cpu size={18} className="text-primary-500" />
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                Resolution Pipeline Execution Trace
                              </span>
                            </div>
                            <span className="text-xs font-mono text-slate-400">
                              {simRunning ? 'Status: Processing' : simComplete ? 'Status: Complete' : 'Status: Ready'}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-2 mb-6">
                            <div className={`p-2.5 rounded-xl border text-center transition-all ${
                              simStage >= 1 ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}>
                              <div className="text-[10px] uppercase font-bold">Step 1</div>
                              <div className="text-xs truncate">Ingestion & Hash</div>
                            </div>
                            <div className={`p-2.5 rounded-xl border text-center transition-all ${
                              simStage >= 2 ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}>
                              <div className="text-[10px] uppercase font-bold">Step 2</div>
                              <div className="text-xs truncate">Soundex Blocking</div>
                            </div>
                            <div className={`p-2.5 rounded-xl border text-center transition-all ${
                              simStage >= 3 ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}>
                              <div className="text-[10px] uppercase font-bold">Step 3</div>
                              <div className="text-xs truncate">Distance Scoring</div>
                            </div>
                            <div className={`p-2.5 rounded-xl border text-center transition-all ${
                              simStage >= 4 || simComplete ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : 'border-slate-200 dark:border-slate-800 text-slate-400'
                            }`}>
                              <div className="text-[10px] uppercase font-bold">Step 4</div>
                              <div className="text-xs truncate">Golden Profile</div>
                            </div>
                          </div>

                          {simComplete ? (
                            <div className="space-y-4 animate-fade-in">
                              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                                currentScenario.metrics.compositeScore >= sensitivity
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                              }`}>
                                <div className="flex items-center gap-3">
                                  {currentScenario.metrics.compositeScore >= sensitivity ? (
                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                  ) : (
                                    <AlertTriangle size={24} className="text-amber-500" />
                                  )}
                                  <div>
                                    <div className="font-extrabold text-sm">{currentScenario.metrics.statusText}</div>
                                    <div className="text-xs opacity-90">
                                      Match Score: <span className="font-mono font-bold text-base">{currentScenario.metrics.compositeScore}%</span> (Threshold: {sensitivity}%)
                                    </div>
                                  </div>
                                </div>
                                <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-white/50 dark:bg-slate-900/50 font-bold">
                                  {currentScenario.metrics.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Jaro-Winkler</span>
                                  <span className="font-mono font-bold text-sm text-primary-600 dark:text-primary-400">
                                    {(currentScenario.metrics.nameJaroWinkler * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">DOB Match</span>
                                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    {(currentScenario.metrics.dobMatch * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Phone Exact</span>
                                  <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                    {(currentScenario.metrics.phoneMatch * 100).toFixed(0)}%
                                  </span>
                                </div>
                                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Address Levenshtein</span>
                                  <span className="font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
                                    {(currentScenario.metrics.addressLevenshtein * 100).toFixed(0)}%
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs uppercase font-extrabold text-primary-600 dark:text-primary-400 flex items-center gap-1.5">
                                    <Award size={14} />
                                    Synthesized Golden Record
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">Cluster #C-9042</span>
                                </div>
                                <div className="text-xs space-y-1 text-slate-700 dark:text-slate-300">
                                  <div><strong>Authoritative Name:</strong> {currentScenario.conflictResolution.finalName}</div>
                                  <div><strong>Authoritative Address:</strong> {currentScenario.conflictResolution.finalAddress}</div>
                                  <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                                    <strong>Arbitration Policy:</strong> {currentScenario.conflictResolution.decision}
                                  </div>
                                </div>
                              </div>

                              <div className="p-2.5 rounded-lg bg-slate-900 text-slate-300 font-mono text-[11px] flex items-center justify-between border border-slate-800">
                                <div className="flex items-center gap-2 truncate">
                                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                                  <span className="truncate">audit_hash: 7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1f...</span>
                                </div>
                                <span className="text-emerald-400 font-bold shrink-0">VERIFIED</span>
                              </div>
                            </div>
                          ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-3">
                                <Play size={20} className="fill-current ml-0.5" />
                              </div>
                              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                                Ready for Resolution Engine Simulation
                              </h3>
                              <p className="text-xs text-slate-500 max-w-sm mt-1">
                                Click "Run VeriSync Match Engine" on the left to watch live candidate retrieval, 
                                metric scoring, conflict arbitration, and golden profile minting.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. ONLY ARCHITECTURE */}
            {activeSection === 'architecture' && (
              <div>
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Network size={12} />
                    System Architecture
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    5-Stage Multi-Vector Resolution Pipeline
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                    Candidate blocking, multi-algorithm scoring, conflict arbitration, and golden profile minting.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    {
                      step: '01',
                      title: 'Data Ingestion & Sanitization',
                      icon: <Database size={20} />,
                      detail: 'Standardizes Unicode character sets, normalizes phone numbers (E.164), extracts DOB components, and strips noise tokens.'
                    },
                    {
                      step: '02',
                      title: 'Candidate Blocking Filter',
                      icon: <FilterIcon size={20} />,
                      detail: 'Applies Soundex and Double Metaphone phonetic indexing to reduce Cartesian complexity from O(N²) to O(N log N).'
                    },
                    {
                      step: '03',
                      title: 'Multi-Vector Metric Scoring',
                      icon: <Sliders size={20} />,
                      detail: 'Computes Jaro-Winkler string distance, Levenshtein edit distance, DOB delta, and exact SHA-256 mobile/tax hash matches.'
                    },
                    {
                      step: '04',
                      title: 'Conflict Arbitration Arbiter',
                      icon: <GitPullRequest size={20} />,
                      detail: 'Applies Source Authority Hierarchy weights (UIDAI > DigiLocker > ABHA) and timestamp recency to resolve divergent attributes.'
                    },
                    {
                      step: '05',
                      title: 'Golden Record & Audit Seal',
                      icon: <Award size={20} />,
                      detail: 'Mints unified 360° Golden Profile, seals cryptographic SHA-256 audit ledger, and enables one-click rollback if needed.'
                    }
                  ].map((st, i) => (
                    <div
                      key={i}
                      onClick={() => setArchitectureStep(i + 1)}
                      className={`p-6 rounded-2xl cursor-pointer transition-all border ${
                        architectureStep === i + 1
                          ? 'bg-white dark:bg-slate-900 border-primary-500 shadow-premium scale-[1.02]'
                          : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-mono font-bold text-primary-500">STAGE {st.step}</span>
                        <div className={`p-2 rounded-xl ${
                          architectureStep === i + 1 ? 'bg-primary-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}>
                          {st.icon}
                        </div>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">{st.title}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{st.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-primary-900/10 via-indigo-900/10 to-purple-900/10 border border-primary-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={28} className="text-primary-500 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Formal OpenAPI Specification & Architectural Documentation
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Inspect the complete API spec, 3-tier MVC architecture, and database entity dictionary.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      to="/login"
                      className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <span>Access API Specs</span>
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* 3. ONLY ROLE PORTALS */}
            {activeSection === 'portals' && (
              <div>
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Users size={12} />
                    Stakeholder Portals
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Dedicated Stakeholder Portals
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                    Zero-trust role segregation with tailored workflows for Citizens, Operators, Admins, and Auditors.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Citizen */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4">
                        <User size={22} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Individual Citizen</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Self-service portal to claim and link Aadhaar, generate ABHA, pull DigiLocker credentials, and view unified Golden Record.
                      </p>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> 4-Stage Credential Claim Workflow</div>
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Real-Time Linking Timeline</div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={isAuthenticated && isCitizen ? "/citizen/dashboard" : "/claim-credentials"}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Enter Citizen Portal</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Operator */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center mb-4">
                        <FileText size={22} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Ingestion Operator</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Batch registration, pre-flight duplicate detection, field sanitization, and manual verification desk.
                      </p>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Single & Bulk Identity Ingestion</div>
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Verification Desk Quarantine Queue</div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={isAuthenticated && isOperator ? "/operator/dashboard" : "/login"}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Enter Operator Workspace</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Org Admin */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                        <Building2 size={22} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Organization Admin</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Multi-tenant agency control: oversee departmental identities, assign operator seats, and monitor clusters.
                      </p>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Department Identity Records</div>
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Operator Staff Quotas & RBAC</div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={isAuthenticated && isOrgAdmin ? "/organization/dashboard" : "/login"}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Enter Org Dashboard</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Auditor */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                        <Eye size={22} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Compliance Auditor</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Forensic audit logs, decision explainability traces, resolution rollback inspection, and SHA-256 verification.
                      </p>
                      <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Immutable SHA-256 Audit Trail</div>
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Resolution Trace Inspection</div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={isAuthenticated && isAuditor ? "/auditor/dashboard" : "/login"}
                        className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                      >
                        <span>Enter Auditor Desk</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>

                  {/* Super Admin */}
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft flex flex-col justify-between md:col-span-2">
                    <div>
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
                        <Shield size={22} />
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">System Super Admin</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-3">
                        Global cluster analytics, matching algorithm threshold sensitivity, system user management, and health metrics.
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> Global Strategy Sensitivity</div>
                        <div className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" /> System Users & RBAC</div>
                      </div>
                    </div>
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Link
                        to={isAuthenticated && isSuperAdmin ? "/admin/dashboard" : "/login"}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all inline-flex"
                      >
                        <span>Enter Super Admin Console</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ONLY ZERO-TRUST AUDIT */}
            {activeSection === 'security' && (
              <div>
                <div className="text-center max-w-3xl mx-auto mb-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <ShieldCheck size={12} />
                    Trust & Compliance
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Zero-Trust Architecture & Regulatory Compliance
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                    Engineered for DPDP compliance, zero-knowledge verification, and cryptographic auditability.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-4">
                      <Lock size={22} />
                    </div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">Cryptographic Audit Ledger</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Every record resolution, automatic merge, and manual operator override generates a deterministic SHA-256 block hash.
                    </p>
                    <div className="font-mono text-[10px] p-2 rounded-lg bg-slate-900 text-emerald-400 truncate">
                      sha256(prev_hash + decision_vector)
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
                    <div className="w-12 h-12 rounded-2xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4">
                      <Shield size={22} />
                    </div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">DPDP & Privacy-First</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Adherence to India's DPDP Act and GDPR. Citizens hold sovereign consent rights with full visibility into linked registries.
                    </p>
                    <div className="font-mono text-[10px] p-2 rounded-lg bg-slate-900 text-primary-400 truncate">
                      consent_token: valid_purpose_kyc
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-soft">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4">
                      <History size={22} />
                    </div>
                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">Non-Destructive Rollback</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                      Raw source identities are never mutated or discarded. The Golden Record is a virtual composite view with instant rollback.
                    </p>
                    <div className="font-mono text-[10px] p-2 rounded-lg bg-slate-900 text-indigo-400 truncate">
                      cluster.split() &rarr; state_reverted
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. ONLY FAQ */}
            {activeSection === 'faq' && (
              <div className="max-w-3xl mx-auto space-y-4">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider mb-3">
                    <Info size={12} />
                    Evaluation & Viva
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                    Frequently Asked Technical Questions
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 mt-2 text-sm sm:text-base">
                    Key algorithmic concepts, constitutional privacy constraints, and architectural rationales.
                  </p>
                </div>

                {faqItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm"
                  >
                    <button
                      onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                      className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none cursor-pointer"
                    >
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {item.q}
                      </span>
                      <div className={`p-1 rounded-lg text-slate-400 transition-transform ${
                        activeFaq === idx ? 'rotate-180 text-primary-500' : ''
                      }`}>
                        <ChevronDown size={16} />
                      </div>
                    </button>
                    {activeFaq === idx && (
                      <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3 animate-fade-in">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────
          FOOTER SECTION (ALWAYS VISIBLE AT BOTTOM)
      ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-slate-400 text-xs py-12 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 pb-8 border-b border-slate-900">
            {/* Col 1: Brand Info */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold">
                  <Fingerprint size={18} />
                </div>
                <span className="text-base font-extrabold text-white tracking-wider">VeriSync</span>
              </div>
              <p className="text-slate-400 text-xs max-w-md italic">
                Bridging disparate identity sources into a single, trustworthy credential hub.
              </p>
              <p className="text-slate-500 text-[11px] max-w-md">
                National Cross-System Identity Resolution & Golden Profile Engine. 
                Built with React 19, Tailwind CSS, Python Flask, and SQLite/PostgreSQL.
              </p>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Workspaces</h5>
              <ul className="space-y-2">
                <li><Link to="/citizen/dashboard" className="hover:text-white transition-colors">Citizen Portal</Link></li>
                <li><Link to="/operator/dashboard" className="hover:text-white transition-colors">Ingestion Operator</Link></li>
                <li><Link to="/organization/dashboard" className="hover:text-white transition-colors">Organization Admin</Link></li>
                <li><Link to="/auditor/dashboard" className="hover:text-white transition-colors">Compliance Auditor</Link></li>
                <li><Link to="/admin/dashboard" className="hover:text-white transition-colors">Super Admin</Link></li>
              </ul>
            </div>

            {/* Col 3: Technical Docs */}
            <div>
              <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3">Specifications</h5>
              <ul className="space-y-2">
                <li>
                  <button onClick={() => handleSelectSection('simulator')} className="hover:text-white transition-colors text-left cursor-pointer">
                    Resolution Simulator
                  </button>
                </li>
                <li>
                  <button onClick={() => handleSelectSection('architecture')} className="hover:text-white transition-colors text-left cursor-pointer">
                    Engine Pipeline
                  </button>
                </li>
                <li>
                  <button onClick={() => handleSelectSection('security')} className="hover:text-white transition-colors text-left cursor-pointer">
                    SHA-256 Audit Standard
                  </button>
                </li>
                <li><Link to="/login" className="hover:text-white transition-colors">System Login</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Create Citizen Account</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
            <div>
              &copy; {new Date().getFullYear()} VeriSync Identity Resolution Engine. All rights reserved.
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy Policy</span>
              <span>•</span>
              <span>Terms of Service</span>
              <span>•</span>
              <span>DPDP Compliance</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Inline Filter icon for clean rendering
function FilterIcon({ size = 16, className = '' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
