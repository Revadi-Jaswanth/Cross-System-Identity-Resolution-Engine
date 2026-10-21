import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle } from 'lucide-react';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-soft max-w-md w-full mx-auto animate-fade-in">
      <div className="p-4 bg-slate-100 dark:bg-slate-850 text-slate-400 dark:text-slate-500 rounded-full mb-4">
        <HelpCircle size={36} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">404 - Page Not Found</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
        The requested URL pathway resource does not exist on this server cluster environment.
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
export default NotFoundPage;
