import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { AlertCircle, ChevronRight, ChevronLeft, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';

export const VerificationWizard = ({ onClose, requestUuid = 'REQ-101' }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [decision, setDecision] = useState('APPROVED');
  const [notes, setNotes] = useState('');

  const verifyMutation = useMutation({
    // Simulating decision update callback
    mutationFn: () => api.post('/v1/verification/verify', {
      request_uuid: requestUuid,
      status: decision,
      comments: notes,
      organization_id: 1
    }),
    onSuccess: () => {
      // Invalidation parameters refinements:
      queryClient.invalidateQueries(['verificationHistory']);
      queryClient.invalidateQueries(['verificationDetails']);
      queryClient.invalidateQueries(['dashboardStats']);
      queryClient.invalidateQueries(['clustersList']);
      queryClient.invalidateQueries(['clusterDetails']);
      queryClient.invalidateQueries(['resolutionHistory']);
      queryClient.invalidateQueries(['auditLogs']);
      queryClient.invalidateQueries(['systemHealth']);

      alert('Verification decision submitted successfully!');
      if (onClose) onClose();
    },
    onError: (err) => {
      alert(`Submission failed: ${err.message}`);
    }
  });

  const handleNext = () => {
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 border dark:border-slate-800 rounded-premium shadow-soft space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldCheck size={16} />
          <span>7-Step Verification Workflow</span>
        </h3>
        <span className="text-xs text-slate-400 font-semibold uppercase">Step {step} of 7</span>
      </div>

      {/* Progress navigation */}
      <div className="grid grid-cols-7 gap-1 bg-slate-50 dark:bg-slate-950 p-2 border dark:border-slate-850 rounded text-[9px] font-bold text-center uppercase text-slate-400">
        <span className={step === 1 ? 'text-primary-600' : ''}>1. Request</span>
        <span className={step === 2 ? 'text-primary-600' : ''}>2. Compare</span>
        <span className={step === 3 ? 'text-primary-600' : ''}>3. Explain</span>
        <span className={step === 4 ? 'text-primary-600' : ''}>4. Golden</span>
        <span className={step === 5 ? 'text-primary-600' : ''}>5. Decision</span>
        <span className={step === 6 ? 'text-primary-600' : ''}>6. Confirm</span>
        <span className={step === 7 ? 'text-primary-600' : ''}>7. Submit</span>
      </div>

      <div className="py-4">
        {step === 1 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold text-slate-805 dark:text-slate-300">Verification Request Parameters</p>
            <p>Request Signature: <span className="font-mono">SHA-256-42a8b9f...</span></p>
            <p>Source System: AadhaarService</p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold">Candidate Attributes Mappings</p>
            <p>Comparing incoming attributes against matched candidates. No data conflicts identified.</p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold">RapidFuzz Explainability Breakdown</p>
            <p>Match Score: <span className="text-emerald-500 font-bold">95% Similarity detected</span></p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold font-mono">Golden Profile Preview</p>
            <p>Resolved Name: Rajesh Kumar</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Decision Selection</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDecision('APPROVED')}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-premium text-xs font-bold ${
                    decision === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500' : 'bg-white'
                  }`}
                >
                  <CheckCircle2 size={14} />
                  <span>Approve Match</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('REJECTED')}
                  className={`flex items-center gap-1.5 px-4 py-2 border rounded-premium text-xs font-bold ${
                    decision === 'REJECTED' ? 'bg-rose-500/10 text-rose-500 border-rose-500' : 'bg-white'
                  }`}
                >
                  <XCircle size={14} />
                  <span>Reject Match</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Operator Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-2.5 border rounded-premium text-xs bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
                placeholder="Include verification comments..."
                rows={3}
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-2 text-xs">
            <p className="font-bold">Confirmation Checklist</p>
            <p>Decision: <span className="font-bold text-primary-500">{decision}</span></p>
            <p>Notes: {notes || 'None included'}</p>
          </div>
        )}

        {step === 7 && (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-slate-400">All checks completed. Click submit to execute verification decision.</p>
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isLoading}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium font-semibold text-xs uppercase tracking-wider shadow-soft transition-colors"
            >
              {verifyMutation.isLoading ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between border-t pt-4">
        {step > 1 && step < 7 ? (
          <button
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-premium text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>
        ) : <div />}

        {step < 7 && (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold transition-colors"
          >
            <span>Next Step</span>
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
};
export default VerificationWizard;
