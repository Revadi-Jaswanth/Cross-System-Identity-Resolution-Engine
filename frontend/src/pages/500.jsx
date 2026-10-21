import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertOctagon } from 'lucide-react';

export const ServerErrorPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft max-w-md w-full mx-auto animate-fade-in">
      <div className="p-4 bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-full mb-4">
        <AlertOctagon size={36} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">500 - Internal Server Error</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        An unexpected runtime crash occurred within the backend service application context.
      </p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-premium text-sm font-semibold transition-all shadow-soft"
      >
        Return to Dashboard
      </button>
    </div>
  );
};
export default ServerErrorPage;
