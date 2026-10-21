import React from 'react';
import { ShieldAlert } from 'lucide-react';

export const AccessDenied = () => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-premium shadow-soft">
      <div className="p-4 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full mb-4 animate-bounce">
        <ShieldAlert size={32} />
      </div>
      <h3 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-2">Access Denied</h3>
      <p className="text-sm text-amber-600/80 dark:text-amber-400/80 max-w-sm">
        Your user roles or permissions claims do not grant rights to access this resource or execute this action.
      </p>
    </div>
  );
};
