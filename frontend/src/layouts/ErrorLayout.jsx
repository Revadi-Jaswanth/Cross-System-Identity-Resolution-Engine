import React from 'react';
import { Outlet } from 'react-router-dom';

export const ErrorLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-6 text-center">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-premium shadow-premium p-8">
        <Outlet />
      </div>
    </div>
  );
};
export default ErrorLayout;
