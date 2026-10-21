import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import IdentityForm from '@/components/identity/IdentityForm';

export const IdentityRegistration = () => {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Ingest Identity Record
          </h1>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            Register a single physical identity payload.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft p-6 max-w-2xl">
        {success ? (
          <div className="text-center py-12 space-y-4 animate-fade-in">
            <div className="inline-flex p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 rounded-full mb-2">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Ingestion Successful!
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Identity record resolved and matching strategies executed.
            </p>
            <div className="flex items-center gap-3 justify-center pt-4">
              <button
                onClick={() => setSuccess(false)}
                className="px-4 py-2 border rounded-premium text-xs font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                Ingest Another
              </button>
              <button
                onClick={() => navigate('/identities')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-xs font-semibold shadow-soft transition-colors"
              >
                Go to Identities list
              </button>
            </div>
          </div>
        ) : (
          <IdentityForm onSuccess={() => setSuccess(true)} />
        )}
      </div>
    </div>
  );
};
export default IdentityRegistration;
