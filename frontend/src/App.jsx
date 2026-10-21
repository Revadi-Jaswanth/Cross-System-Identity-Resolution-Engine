import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Providers
import { QueryProvider } from '@/providers/QueryProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { AuthProvider } from '@/context/AuthContext';

// Layouts
import DashboardLayout from '@/layouts/DashboardLayout';
import AuthLayout from '@/layouts/AuthLayout';

// Guards
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import GuestRoute from '@/components/layout/GuestRoute';
import PermissionGuard from '@/components/layout/PermissionGuard';
import RoleGuard from '@/components/layout/RoleGuard';

// Pages
import Dashboard from '@/pages/Dashboard';
import Login from '@/pages/Login';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ChangePassword from '@/pages/ChangePassword';
import Users from '@/pages/Users';
import UserDetails from '@/pages/UserDetails';
import Organizations from '@/pages/Organizations';
import OrganizationDetails from '@/pages/OrganizationDetails';
import Identities from '@/pages/Identities';
import IdentityDetails from '@/pages/IdentityDetails';
import IdentityRegistration from '@/pages/IdentityRegistration';
import BulkRegistration from '@/pages/BulkRegistration';
import IdentityResolution from '@/pages/IdentityResolution';
import ResolutionDetails from '@/pages/ResolutionDetails';
import ResolutionHistory from '@/pages/ResolutionHistory';
import GoldenProfile from '@/pages/GoldenProfile';
import Clusters from '@/pages/Clusters';
import ClusterDetails from '@/pages/ClusterDetails';
import MergeHistory from '@/pages/MergeHistory';
import Verification from '@/pages/Verification';
import VerificationDetails from '@/pages/VerificationDetails';
import AuditLogs from '@/pages/AuditLogs';
import SystemSettings from '@/pages/SystemSettings';
import Monitoring from '@/pages/Monitoring';
import FeatureFlags from '@/pages/FeatureFlags';
import LogsViewer from '@/pages/LogsViewer';
import Profile from '@/pages/Profile';
import Analytics from '@/pages/Analytics';

import ClaimCredentials from '@/pages/ClaimCredentials';
import OrgAdminDashboard from '@/pages/OrgAdminDashboard';
import OperatorDashboard from '@/pages/OperatorDashboard';
import AuditorDashboard from '@/pages/AuditorDashboard';
import CitizenDashboard from '@/pages/CitizenDashboard';
import HomePage from '@/pages/HomePage';

import RegisterAccount from '@/pages/RegisterAccount';

// Error status pages
import AccessDeniedPage from '@/pages/403';
import NotFoundPage from '@/pages/404';
import ServerErrorPage from '@/pages/500';

// Role-Based Root Landing Router
function RoleBasedLanding() {
  const { isSuperAdmin, isOrgAdmin, isOperator, isAuditor, isCitizen } = usePermissions();

  if (isCitizen) return <Navigate to="/citizen/dashboard" replace />;
  if (isAuditor) return <Navigate to="/auditor/dashboard" replace />;
  if (isOperator) return <Navigate to="/operator/dashboard" replace />;
  if (isOrgAdmin) return <Navigate to="/organization/dashboard" replace />;
  if (isSuperAdmin) return <Navigate to="/admin/dashboard" replace />;
  return <Dashboard />;
}

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Project Homepage */}
                <Route path="/" element={<HomePage />} />
                <Route path="/home" element={<HomePage />} />

                {/* Guest Auth Routes */}
                <Route element={<GuestRoute />}>
                  <Route element={<AuthLayout />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<RegisterAccount />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                  </Route>
                </Route>

                {/* Private Authenticated Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    {/* Role-based Landing Dashboards */}
                    <Route path="/dashboard" element={<RoleBasedLanding />} />
                    <Route path="/admin/dashboard" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN']}>
                        <Dashboard />
                      </RoleGuard>
                    } />
                    <Route path="/organization/dashboard" element={
                      <RoleGuard roles={['Organization Admin', 'ORG_ADMIN', 'Super Admin', 'SUPER_ADMIN']}>
                        <OrgAdminDashboard />
                      </RoleGuard>
                    } />
                    <Route path="/operator/dashboard" element={
                      <RoleGuard roles={['Operator', 'INGEST_OPERATOR', 'OPERATOR', 'Super Admin', 'SUPER_ADMIN']}>
                        <OperatorDashboard />
                      </RoleGuard>
                    } />
                    <Route path="/auditor/dashboard" element={
                      <RoleGuard roles={['Auditor', 'AUDITOR', 'Super Admin', 'SUPER_ADMIN']}>
                        <AuditorDashboard />
                      </RoleGuard>
                    } />
                    <Route path="/citizen/dashboard" element={
                      <RoleGuard roles={['Citizen', 'CITIZEN', 'Individual Citizen', 'Super Admin', 'SUPER_ADMIN']}>
                        <CitizenDashboard />
                      </RoleGuard>
                    } />

                    {/* Common & Portal Routes */}
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/change-password" element={<ChangePassword />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/claim-credentials" element={
                      <RoleGuard roles={['Citizen', 'CITIZEN', 'Individual Citizen', 'Super Admin', 'SUPER_ADMIN']}>
                        <ClaimCredentials />
                      </RoleGuard>
                    } />

                    {/* Identities & resolution actions */}
                    <Route path="/identities" element={
                      <PermissionGuard permissions="identity:read">
                        <Identities />
                      </PermissionGuard>
                    } />
                    <Route path="/identities/:uuid" element={
                      <PermissionGuard permissions="identity:read">
                        <IdentityDetails />
                      </PermissionGuard>
                    } />
                    <Route path="/identities/register" element={
                      <PermissionGuard permissions="identity:write">
                        <IdentityRegistration />
                      </PermissionGuard>
                    } />
                    <Route path="/identities/bulk" element={
                      <PermissionGuard permissions="identity:write">
                        <BulkRegistration />
                      </PermissionGuard>
                    } />
                    <Route path="/resolution" element={
                      <PermissionGuard permissions="identity:read">
                        <IdentityResolution />
                      </PermissionGuard>
                    } />
                    <Route path="/resolution/details" element={
                      <PermissionGuard permissions="identity:read">
                        <ResolutionDetails />
                      </PermissionGuard>
                    } />
                    <Route path="/resolution/history" element={
                      <PermissionGuard permissions="identity:read">
                        <ResolutionHistory />
                      </PermissionGuard>
                    } />

                    {/* Clusters & Golden profiles */}
                    <Route path="/clusters" element={
                      <PermissionGuard permissions="identity:read">
                        <Clusters />
                      </PermissionGuard>
                    } />
                    <Route path="/clusters/:uuid" element={
                      <PermissionGuard permissions="identity:read">
                        <ClusterDetails />
                      </PermissionGuard>
                    } />
                    <Route path="/clusters/:uuid/golden" element={
                      <PermissionGuard permissions="identity:read">
                        <GoldenProfile />
                      </PermissionGuard>
                    } />
                    <Route path="/merge-history" element={
                      <PermissionGuard permissions="identity:read">
                        <MergeHistory />
                      </PermissionGuard>
                    } />
                    <Route path="/verification" element={
                      <PermissionGuard permissions="identity:read">
                        <Verification />
                      </PermissionGuard>
                    } />
                    <Route path="/verification/requests/:uuid" element={
                      <PermissionGuard permissions="identity:read">
                        <VerificationDetails />
                      </PermissionGuard>
                    } />

                    {/* Admin console limits */}
                    <Route path="/organizations" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN', 'Organization Admin', 'ORG_ADMIN']}>
                        <Organizations />
                      </RoleGuard>
                    } />
                    <Route path="/organizations/:uuid" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN', 'Organization Admin', 'ORG_ADMIN']}>
                        <OrganizationDetails />
                      </RoleGuard>
                    } />
                    <Route path="/users" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN', 'Organization Admin', 'ORG_ADMIN']}>
                        <Users />
                      </RoleGuard>
                    } />
                    <Route path="/users/:uuid" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN', 'Organization Admin', 'ORG_ADMIN']}>
                        <UserDetails />
                      </RoleGuard>
                    } />
                    <Route path="/audit-logs" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN', 'Auditor', 'AUDITOR']}>
                        <AuditLogs />
                      </RoleGuard>
                    } />
                    <Route path="/settings" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN']}>
                        <SystemSettings />
                      </RoleGuard>
                    } />
                    <Route path="/monitoring" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN']}>
                        <Monitoring />
                      </RoleGuard>
                    } />
                    <Route path="/feature-flags" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN']}>
                        <FeatureFlags />
                      </RoleGuard>
                    } />
                    <Route path="/logs" element={
                      <RoleGuard roles={['Super Admin', 'SUPER_ADMIN']}>
                        <LogsViewer />
                      </RoleGuard>
                    } />

                    {/* Explicit static status routing */}
                    <Route path="/403" element={<AccessDeniedPage />} />
                    <Route path="/500" element={<ServerErrorPage />} />
                  </Route>
                </Route>

                {/* Catch-all 404 Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
