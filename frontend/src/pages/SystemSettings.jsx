import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { Settings, Save, RefreshCw, Undo } from 'lucide-react';
import SettingsDiffModal from '@/components/system/SettingsDiffModal';

export const SystemSettings = () => {
  const queryClient = useQueryClient();
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Form values state mapping key/value pairs
  const [formSettings, setFormSettings] = useState([]);

  // Fetch System Settings
  const { data: originalSettings, isLoading, refetch } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: async () => {
      const res = await api.get('/v1/system/settings');
      return res.data?.data || [];
    },
    onSuccess: (data) => {
      setFormSettings(JSON.parse(JSON.stringify(data))); // Deep copy
    }
  });

  // Automatically load settings when data changes
  useEffect(() => {
    if (originalSettings) {
      setFormSettings(JSON.parse(JSON.stringify(originalSettings)));
    }
  }, [originalSettings]);

  // Unsaved changes listener warning
  useEffect(() => {
    const isDirty = JSON.stringify(originalSettings) !== JSON.stringify(formSettings);
    setDirty(isDirty);

    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved configuration changes. Leave page?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formSettings, originalSettings]);

  const updateSettingMutation = useMutation({
    mutationFn: ({ key, payload }) => api.put(`/v1/system/settings/${key}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['systemSettings']);
      queryClient.invalidateQueries(['systemHealth']);
      queryClient.invalidateQueries(['dashboardStats']);
      queryClient.invalidateQueries(['monitoring']);
      queryClient.invalidateQueries(['featureFlags']);
      setConfirmOpen(false);
      alert('Configurations updated successfully!');
    },
    onError: (err) => {
      alert(`Optimistic locking conflict: ${err.message}`);
    }
  });

  const handleValueChange = (key, val) => {
    setFormSettings(prev =>
      prev.map(s => s.setting_key === key ? { ...s, setting_value: val } : s)
    );
  };

  const handleSubmitAll = (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const executeBulkUpdates = () => {
    // Process settings changes iteratively
    formSettings.forEach(item => {
      const orig = originalSettings.find(s => s.setting_key === item.setting_key) || {};
      if (orig.setting_value !== item.setting_value) {
        updateSettingMutation.mutate({
          key: item.setting_key,
          payload: {
            setting_value: item.setting_value,
            version: orig.version
          }
        });
      }
    });
  };

  const handleResetDefaults = () => {
    if (window.confirm("Are you sure you want to discard changes?")) {
      setFormSettings(JSON.parse(JSON.stringify(originalSettings)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
            <Settings className="text-primary-500" size={24} />
            <span>Console configurations</span>
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Configure system parameters, authentication limits, and RapidFuzz thresholds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-500 font-semibold uppercase animate-pulse">
              Unsaved changes detected
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="p-2 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-premium text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmitAll} className="space-y-6 max-w-xl">
        <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 p-6 rounded-premium shadow-soft space-y-4">
          {formSettings.map((item) => (
            <div key={item.setting_key} className="space-y-1.5">
              <label className="block text-xs font-semibold uppercase text-slate-400">
                {item.setting_key.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                value={item.setting_value}
                onChange={(e) => handleValueChange(item.setting_key, e.target.value)}
                className="w-full p-2.5 border rounded-premium text-sm bg-slate-50 dark:bg-slate-950 dark:border-slate-800 font-mono"
              />
              <p className="text-[10px] text-slate-400 font-medium">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t pt-4">
          <button
            type="submit"
            disabled={!dirty}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-premium font-semibold text-xs uppercase tracking-wider disabled:bg-slate-200 disabled:text-slate-400 transition-colors"
          >
            <Save size={14} />
            <span>Save configurations</span>
          </button>

          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={!dirty}
            className="flex items-center gap-1.5 px-4 py-2.5 border rounded-premium font-semibold text-xs text-slate-500 uppercase tracking-wider disabled:opacity-50 transition-colors"
          >
            <Undo size={14} />
            <span>Reset Changes</span>
          </button>
        </div>
      </form>

      {/* Changes verification overlay */}
      <SettingsDiffModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={executeBulkUpdates}
        beforeSettings={originalSettings}
        afterSettings={formSettings}
      />
    </div>
  );
};
export default SystemSettings;
