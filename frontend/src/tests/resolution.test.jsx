import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { IdentityResolution } from '../pages/IdentityResolution';
import { ResolutionDetails } from '../pages/ResolutionDetails';
import api from '../lib/axios';

// Mock Axios API instance
vi.mock('../lib/axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn()
    }
  };
});

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'testuser', roles: ['Super Admin'] }
  })
}));

vi.mock('../hooks/usePermissions', () => ({
  usePermissions: () => ({
    canRead: true,
    canWrite: true
  })
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false
    }
  }
});

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Identity Resolution Workspace Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render resolution workspace layout search headers', async () => {
    renderWithProviders(<IdentityResolution />);
    expect(screen.getByText('Resolution Workspace')).toBeDefined();
  });

  it('should render candidate details comparison grid', async () => {
    renderWithProviders(<ResolutionDetails />);
    expect(screen.getByText('Compare Match Candidates Side-by-Side')).toBeDefined();
    expect(screen.getByText('Incoming Record Attributes')).toBeDefined();
    expect(screen.getByText('Target Candidate Attributes')).toBeDefined();
  });
});
