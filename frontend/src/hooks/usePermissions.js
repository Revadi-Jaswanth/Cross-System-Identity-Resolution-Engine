import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, hasRole, hasPermission } = useAuth();

  const canReadUsers = hasPermission('user:read');
  const canWriteUsers = hasPermission('user:write');
  const canReadOrgs = hasPermission('organization:read');
  const canWriteOrgs = hasPermission('organization:write');
  const canReadIdentities = hasPermission('identity:read');
  const canWriteIdentities = hasPermission('identity:write');
  const canMergeClusters = hasPermission('cluster:merge');
  const canManageSystem = hasPermission('system:settings');

  const isSuperAdmin = hasRole('Super Admin') || hasRole('SUPER_ADMIN');
  const isOrgAdmin = hasRole('Organization Admin') || hasRole('ORG_ADMIN');
  const isOperator = hasRole('Operator') || hasRole('INGEST_OPERATOR') || hasRole('OPERATOR');
  const isAuditor = hasRole('Auditor') || hasRole('AUDITOR');
  const isCitizen = hasRole('Citizen') || hasRole('CITIZEN') || hasRole('Individual Citizen');

  return {
    user,
    hasRole,
    hasPermission,
    isSuperAdmin,
    isOrgAdmin,
    isOperator,
    isAuditor,
    isCitizen,
    canReadUsers,
    canWriteUsers,
    canReadOrgs,
    canWriteOrgs,
    canReadIdentities,
    canWriteIdentities,
    canMergeClusters,
    canManageSystem
  };
};
