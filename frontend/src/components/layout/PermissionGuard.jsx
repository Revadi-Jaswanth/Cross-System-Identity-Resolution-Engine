import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { AccessDenied } from '../common/AccessDenied';

export const PermissionGuard = ({ permissions, children }) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permissions)) {
    return (
      <div className="p-6">
        <AccessDenied />
      </div>
    );
  }

  return children;
};
export default PermissionGuard;
