import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const GuestRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const { isSuperAdmin, isOrgAdmin, isOperator, isAuditor, isCitizen } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (isCitizen) return <Navigate to="/citizen/dashboard" replace />;
    if (isAuditor) return <Navigate to="/auditor/dashboard" replace />;
    if (isOperator) return <Navigate to="/operator/dashboard" replace />;
    if (isOrgAdmin) return <Navigate to="/organization/dashboard" replace />;
    if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
