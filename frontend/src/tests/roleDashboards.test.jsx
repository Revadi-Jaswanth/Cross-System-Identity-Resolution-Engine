import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';

import { OrgAdminDashboard } from '../pages/OrgAdminDashboard';
import { OperatorDashboard } from '../pages/OperatorDashboard';
import { AuditorDashboard } from '../pages/AuditorDashboard';
import { CitizenDashboard } from '../pages/CitizenDashboard';
import api from '../lib/axios';

vi.mock('../lib/axios', () => {
  return {
    default: {
      get: vi.fn().mockResolvedValue({
        data: {
          success: true,
          data: {
            total_active_identities: 45,
            total_active_clusters: 12,
            total_merges_completed: 4
          }
        }
      }),
      post: vi.fn()
    }
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const renderComponent = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          {ui}
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('5-Role Dashboards Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Organization Admin Dashboard correctly', () => {
    renderComponent(<OrgAdminDashboard />);
    expect(screen.getByText('Department Operations Dashboard')).toBeDefined();
    expect(screen.getByText('Active Operators')).toBeDefined();
  });

  it('should render Operator Dashboard correctly with primary registration link', () => {
    renderComponent(<OperatorDashboard />);
    expect(screen.getByText('Identity Ingestion Workspace')).toBeDefined();
    expect(screen.getByText('REGISTER NEW IDENTITY')).toBeDefined();
  });

  it('should render Auditor Dashboard in strict read-only mode', () => {
    renderComponent(<AuditorDashboard />);
    expect(screen.getByText('READ-ONLY AUDIT ACCESS')).toBeDefined();
    expect(screen.getByText('MODIFICATIONS: BLOCKED')).toBeDefined();
  });

  it('should render Individual Citizen Dashboard with credentials claim portal link', () => {
    renderComponent(<CitizenDashboard />);
    expect(screen.getByText('Citizen Portal • My Identity Workspace')).toBeDefined();
    expect(screen.getByText('CLAIM CREDENTIALS PORTAL')).toBeDefined();
  });
});
