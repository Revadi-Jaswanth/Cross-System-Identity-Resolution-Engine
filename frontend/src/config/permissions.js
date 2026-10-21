# -*- coding: utf-8 -*-
/**
 * Role-Based Access Control (RBAC) Permitted Actions Mapping.
 * Shared and synchronized with backend authorization assertions.
 */

export const PERMISSIONS = {
  USERS_READ: "user:read",
  USERS_WRITE: "user:write",
  ORGANIZATIONS_READ: "organization:read",
  ORGANIZATIONS_WRITE: "organization:write",
  IDENTITIES_READ: "identity:read",
  IDENTITIES_WRITE: "identity:write",
  CLUSTERS_MERGE: "cluster:merge",
  SYSTEM_SETTINGS: "system:settings"
};

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN: "Organization Admin",
  OPERATOR: "Operator"
};

/**
 * Default role-to-permissions map matching seed settings.
 */
export const ROLE_PERMISSIONS_MAP = {
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ORG_ADMIN]: [
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.ORGANIZATIONS_READ,
    PERMISSIONS.IDENTITIES_READ,
    PERMISSIONS.IDENTITIES_WRITE
  ],
  [ROLES.OPERATOR]: [
    PERMISSIONS.IDENTITIES_READ
  ]
};
