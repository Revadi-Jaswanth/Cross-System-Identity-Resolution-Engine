import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Users } from '../pages/Users';
import { Organizations } from '../pages/Organizations';
import api from '../lib/axios';

// Mock Axios API instance
vi.mock('../lib/axios', () => {
  return {
    default: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
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

describe('User Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render users table and query paginated endpoints', async () => {
    const mockUsersPayload = {
      success: true,
      data: {
        users: [
          {
            uuid: 'u1111',
            username: 'op1',
            email: 'op1@gov.in',
            status: 'ACTIVE',
            roles: ['Operator']
          }
        ],
        metadata: {
          total_pages: 1,
          has_next: false,
          has_prev: false
        }
      }
    };

    api.get.mockImplementation((url) => {
      if (url.includes('/v1/users')) {
        return Promise.resolve({ data: mockUsersPayload });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });

    renderWithProviders(<Users />);

    expect(screen.getByText('Administrative Accounts')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText('op1')).toBeDefined();
      expect(screen.getByText('op1@gov.in')).toBeDefined();
    });
  });
});

describe('Organization Management Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should block non-SuperAdmins from listing orgs', async () => {
    // Render organizations. Since usePermissions mock returns isSuperAdmin = false,
    // it will display the restriction card.
    renderWithProviders(<Organizations />);
    
    expect(screen.getByText('Access Restrained')).toBeDefined();
  });
});
