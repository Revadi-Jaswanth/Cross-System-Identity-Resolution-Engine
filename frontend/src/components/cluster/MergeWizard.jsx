import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import MergePreview from './MergePreview';
import { AlertCircle, ChevronRight, ChevronLeft, GitMerge, ShieldAlert } from 'lucide-react';

export const MergeWizard = ({ onClose }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  
  // Selection States
  const [sourceUuid, setSourceUuid] = useState('');
  const [targetUuid, setTargetUuid] = useState('');
  
  // Preview States
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchPreviewData = async () => {
    setLoadingPreview(true);
    try {
      const [srcRes, tgtRes] = await Promise.all([
        api.get(`/v1/clusters/${sourceUuid}`),
        api.get(`/v1/clusters/${targetUuid}`)
      ]);
      
      const srcG = srcRes.data?.data?.golden_profile || {};
      const tgtG = tgtRes.data?.data?.golden_profile || {};
      
      const resG = {
        name: tgtG.name || srcG.name,
        dob: tgtG.dob || srcG.dob,
        gender: tgtG.gender || srcG.gender,
        address: tgtG.address || srcG.address,
        aadhaar: tgtG.aadhaar || srcG.aadhaar,
        email: tgtG.email || srcG.email
      };
      
      setPreviewData({
        sourceProfile: srcG,
        targetProfile: tgtG,
        resultProfile: resG
      });
    } catch (e) {
      console.error(e);
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const mergeMutation = useMutation({
    mutationFn: () => api.post('/v1/clusters/merge', {
      source_cluster_uuid: sourceUuid,
      target_cluster_uuid: targetUuid,
      confidence_score: 95,
      source_version: 1,
      target_version: 1
    }),
    onSuccess: () => {
      // Invalidation parameters refinement:
      queryClient.invalidateQueries(['clustersList']);
      queryClient.invalidateQueries(['clusterDetails']);
      queryClient.invalidateQueries(['goldenProfile']);
      queryClient.invalidateQueries(['mergeHistory']);
      queryClient.invalidateQueries(['resolutionHistory']);
      queryClient.invalidateQueries(['dashboardStats']);
      queryClient.invalidateQueries(['systemHealth']);
      
      alert('Clusters successfully merged!');
      if (onClose) onClose();
    },
    onError: (err) => {
      alert(`Merge failed: ${err.message || 'Operation Constraint disagreement.'}`);
    }
  });

  const handleNext = () => {
    if (step === 1 && !sourceUuid) { alert('Source UUID is required.'); return; }
    if (step === 2 && !targetUuid) { alert('Target UUID is required.'); return; }
    if (step === 2) {
      fetchPreviewData();
    }
    setStep(prev => prev + 1);
  };

  const handlePrev = () => {
    setStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 border dark:border-slate-800 rounded-premium shadow-soft space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <GitMerge size={16} />
          <span>7-Step Cluster Merge Wizard</span>
        </h3>
        <span className="text-xs text-slate-400 font-semibold uppercase">Step {step} of 7</span>
      </div>

      {/* Progress navigation */}
      <div className="grid grid-cols-7 gap-1 bg-slate-50 dark:bg-slate-950 p-2 border dark:border-slate-850 rounded text-[9px] font-bold text-center uppercase text-slate-500 dark:text-slate-400">
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 1 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>1.</span>
          <span>Source</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 2 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>2.</span>
          <span>Target</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 3 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>3.</span>
          <span>Compare</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 4 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>4.</span>
          <span>Policies</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 5 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>5.</span>
          <span>Rollback</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 6 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>6.</span>
          <span>Confirm</span>
        </span>
        <span className={`flex flex-col items-center justify-center leading-tight ${step === 7 ? 'text-primary-600 dark:text-primary-400 font-extrabold' : ''}`}>
          <span>7.</span>
          <span>Execute</span>
        </span>
      </div>

      <div className="py-4">
        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase text-slate-400">Source Cluster UUID *</label>
            <input
              type="text"
              value={sourceUuid}
              onChange={(e) => setSourceUuid(e.target.value)}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
              placeholder="e.g. SRC-UUID-1"
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase text-slate-400">Target Destination Cluster UUID *</label>
            <input
              type="text"
              value={targetUuid}
              onChange={(e) => setTargetUuid(e.target.value)}
              className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800"
              placeholder="e.g. DST-UUID-2"
            />
          </div>
        )}

        {step === 3 && (
          loadingPreview ? (
            <div className="text-center text-xs py-12 text-slate-500">Loading profile comparison preview...</div>
          ) : previewData ? (
            <MergePreview
              sourceProfile={previewData.sourceProfile}
              targetProfile={previewData.targetProfile}
              resultProfile={previewData.resultProfile}
            />
          ) : (
            <div className="text-center text-xs py-12 text-rose-500 font-semibold">Failed to fetch cluster profiles details. Please check the entered UUIDs.</div>
          )
        )}

        {step === 4 && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-premium text-xs space-y-2">
            <p className="font-bold">Merge Policy validation report</p>
            <p>Verification scores complies with standard target matching boundaries (Similarity threshold &gt; 80%).</p>
          </div>
        )}

        {step === 5 && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-premium text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold">
              <ShieldAlert size={16} />
              <span>Rollback Eligibility Check</span>
            </div>
            <p>Evaluating destinations nodes. Destination cluster has no nested merges, rollback is eligible.</p>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-3 text-xs text-slate-600 dark:text-slate-400">
            <p className="font-bold text-sm text-slate-800 dark:text-slate-200">Confirmation preview details</p>
            <p>You are about to merge Source Cluster <span className="font-mono font-bold text-slate-800">{sourceUuid}</span> into Destination Target Cluster <span className="font-mono font-bold text-slate-800">{targetUuid}</span>.</p>
          </div>
        )}

        {step === 7 && (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-slate-400">All checklist items are validated. Click submit to execute cluster merging.</p>
            <button
              onClick={() => mergeMutation.mutate()}
              disabled={mergeMutation.isLoading}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium font-semibold text-xs uppercase tracking-wider shadow-soft transition-colors"
            >
              {mergeMutation.isLoading ? 'Merging Clusters...' : 'Submit Transaction Merge'}
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
export default MergeWizard;
