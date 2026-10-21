import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { usePermissions } from '@/hooks/usePermissions';
import { GitMerge, Layers, Search, Pin } from 'lucide-react';
import ResolutionSearch from '@/components/resolution/ResolutionSearch';
import ResolutionFilters from '@/components/resolution/ResolutionFilters';
import CandidateTable from '@/components/resolution/CandidateTable';
import ExplainabilityPanel from '@/components/resolution/ExplainabilityPanel';
import MergePreviewDialog from '@/components/resolution/MergePreviewDialog';
import CommandPalette from '@/components/resolution/CommandPalette';

export const IdentityResolution = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canMergeClusters } = usePermissions();

  const [searchVal, setSearchVal] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [threshold, setThreshold] = useState('80');
  
  // Workspace UI states
  const [paneSize, setPaneSize] = useState(() => parseInt(localStorage.getItem('workspace_pane_size') || '50'));
  const [pinnedIds, setPinnedIds] = useState([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [mergePreviewOpen, setMergePreviewOpen] = useState(false);

  // Keyboard shortcut listener to open command palette (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch candidate list matches
  const { data: candidatesData, isLoading, refetch } = useQuery({
    queryKey: ['candidatesList', searchVal, statusFilter, orgFilter, threshold],
    queryFn: async () => {
      if (!searchVal) return [];
      const res = await api.post('/v1/resolution/resolve', {
        system_source: 'AadhaarService',
        system_uid: 'MOCK-UID',
        organization_id: 1,
        attributes: { name: searchVal }
      });
      // Fallback matching mock structure mapping candidates lists response
      return res.data?.data?.candidates || [
        { id: 101, uuid: 'CANDIDATE-1', score: 92, system_source: 'AadhaarService', status: 'ACTIVE' },
        { id: 102, uuid: 'CANDIDATE-2', score: 85, system_source: 'ABHAService', status: 'ACTIVE' }
      ];
    },
    enabled: !!searchVal
  });

  const handlePin = (id) => {
    setPinnedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleMerge = (cand) => {
    setSelectedCandidate(cand);
    setMergePreviewOpen(true);
  };

  const executeMergeMutation = useMutation({
    mutationFn: () => api.post('/v1/clusters/merge', {
      source_cluster_uuid: 'Incoming-Record-UUID',
      destination_cluster_uuid: selectedCandidate?.uuid || 'Target-Cluster-UUID',
      override_policy: 'TRUSTED_SOURCE_OVERRIDE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['candidatesList']);
      setMergePreviewOpen(false);
      alert('Clusters merged successfully!');
    }
  });

  const savePaneSize = (size) => {
    setPaneSize(size);
    localStorage.setItem('workspace_pane_size', size.toString());
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Layers className="text-primary-500" size={24} />
            <span>Resolution Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Run identity search parameters to trace candidate matches. Press{' '}
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border rounded text-[10px] font-bold">Ctrl+K</kbd>{' '}
            for command lookup.
          </p>
        </div>
      </div>

      {/* Control filters bar */}
      <div className="bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 p-4 rounded-premium space-y-3">
        <ResolutionSearch onSearch={setSearchVal} onReset={() => setSearchVal('')} />
        <ResolutionFilters
          status={statusFilter}
          setStatus={setStatusFilter}
          org={orgFilter}
          setOrg={setOrgFilter}
          threshold={threshold}
          setThreshold={setThreshold}
        />
      </div>

      {/* Split pane layout workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Side: Candidates Grid */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Resolved Candidate matches
            </h3>
            {pinnedIds.length > 0 && (
              <span className="text-[10px] font-bold text-primary-500 uppercase">
                {pinnedIds.length} Pinned Candidates
              </span>
            )}
          </div>
          <CandidateTable
            candidates={candidatesData || []}
            onPin={handlePin}
            onCompare={(cand) => navigate(`/resolution/details`, { state: { cand } })}
            onMerge={handleMerge}
            pinnedIds={pinnedIds}
          />
        </div>

        {/* Right Side: Explainability tracing accordions */}
        <div className="space-y-4">
          <ExplainabilityPanel
            explainData={{
              exact_matches: [],
              fuzzy_score: 92,
              weighted_score: 89,
              completeness_index: 95,
              recommendation: 'AUTO_MERGE',
              merge_policy: 'TRUSTED_SOURCE_OVERRIDE',
              execution_time_ms: 38
            }}
          />
        </div>

      </div>

      {/* Overlay modals */}
      <MergePreviewDialog
        isOpen={mergePreviewOpen}
        onClose={() => setMergePreviewOpen(false)}
        onConfirm={() => executeMergeMutation.mutate()}
        sourceRecord={{ attributes: { name: 'Incoming Identity Record' } }}
        targetCluster={{ name: selectedCandidate?.uuid }}
      />

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onSearch={(v) => { setSearchVal(v); setCommandPaletteOpen(false); }}
      />
    </div>
  );
};
export default IdentityResolution;
