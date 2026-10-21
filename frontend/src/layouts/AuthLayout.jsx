import React from 'react';
import { Outlet } from 'react-router-dom';
import { Fingerprint } from 'lucide-react';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex p-3 bg-primary-600/10 text-primary-600 rounded-full mb-4">
          <Fingerprint size={36} />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
          VeriSync
        </h2>
        <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Secure Authentication Node
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-200 dark:border-slate-800 shadow-soft sm:rounded-premium sm:px-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
export default AuthLayout;
