import React from 'react';
import { Outlet } from 'react-router-dom';

export const FullScreenLayout = () => {
  return (
    <div className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 transition-colors flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium p-6">
        <Outlet />
      </div>
    </div>
  );
};
export default FullScreenLayout;
