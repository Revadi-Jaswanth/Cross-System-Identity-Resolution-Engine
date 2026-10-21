import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, ShieldCheck, Check, AlertCircle } from 'lucide-react';

export const ResolutionDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const candidate = location.state?.cand || { uuid: 'CANDIDATE-1', score: 92, system_source: 'AadhaarService' };

  const fieldComparison = [
    { label: 'Full Name', val1: 'Rajesh Kumar', val2: 'Rajesh Kumar', match: true },
    { label: 'Date of Birth', val1: '1990-01-01', val2: '1990-01-01', match: true },
    { label: 'Gender', val1: 'Male', val2: 'Male', match: true },
    { label: 'Aadhaar ID', val1: '123456789012', val2: '123456789012', match: true },
    { label: 'Email Address', val1: 'rajesh@gov.in', val2: 'rajesh.kumar@gov.in', match: false, diff: 'Fuzzy partial mismatch' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Compare Match Candidates Side-by-Side
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
            Candidate: {candidate.uuid} (Fuzzy score: {candidate.score}%)
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="p-4 w-[20%]">Field Parameters</th>
                <th className="p-4 w-[35%]">Incoming Record Attributes</th>
                <th className="p-4 w-[35%]">Target Candidate Attributes</th>
                <th className="p-4 w-[10%]">Verification Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {fieldComparison.map((field, idx) => (
                <tr 
                  key={idx} 
                  className={`hover:bg-slate-50/50 ${
                    !field.match ? 'bg-amber-500/5' : ''
                  }`}
                >
                  <td className="p-4 font-bold text-slate-700 dark:text-slate-400 uppercase text-[10px] tracking-wider">
                    {field.label}
                  </td>
                  <td className="p-4 font-semibold">{field.val1}</td>
                  <td className="p-4 font-semibold">{field.val2}</td>
                  <td className="p-4">
                    {field.match ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold uppercase">
                        <Check size={14} />
                        <span>Exact Match</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 font-bold uppercase">
                        <AlertCircle size={14} />
                        <span>Fuzzy Conflict</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ResolutionDetails;
