import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '../common/AccessDenied';

export const RoleGuard = ({ roles, children }) => {
  const { hasRole } = usePermissions();

  if (!hasRole(roles)) {
    return (
      <div className="p-6">
        <AccessDenied />
      </div>
    );
  }

  return children;
};
export default RoleGuard;
